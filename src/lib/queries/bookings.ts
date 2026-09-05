import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Booking, BookingWithDetails, Inserts, BookingStatus, SessionSlot } from '@/types/database';
import { isRealSupabaseConfigured } from '@/lib/auth';
import { SEED_BOOKINGS } from '@/lib/data/mockData';

// In-memory bookings store for preview and testing
export const IN_MEMORY_BOOKINGS: (BookingWithDetails & { isInMemory?: boolean })[] = [...SEED_BOOKINGS];

export async function fetchConfirmedBookingsForConflictCheck(
  client: SupabaseClient<Database>,
  huzurId: string
): Promise<{ event_date: string; status: string }[]> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('bookings')
        .select('event_date, status')
        .eq('huzur_id', huzurId)
        .in('status', ['pending', 'confirmed']);

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Supabase conflict fetch error:', err);
    }
  }

  // Fallback to in-memory bookings
  return IN_MEMORY_BOOKINGS
    .filter((b) => b.huzur_id === huzurId && (b.status === 'pending' || b.status === 'confirmed'))
    .map((b) => ({ event_date: b.event_date, status: b.status }));
}

export async function checkHuzurDateConflict(
  client: SupabaseClient<Database>,
  huzurId: string,
  eventDate: string
): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('bookings')
        .select('id')
        .eq('huzur_id', huzurId)
        .eq('event_date', eventDate)
        .in('status', ['pending', 'confirmed'])
        .limit(1);

      if (!error && data) {
        return data.length > 0;
      }
    } catch (err) {
      console.warn('Supabase conflict check error:', err);
    }
  }

  // In-memory fallback
  return IN_MEMORY_BOOKINGS.some(
    (b) => b.huzur_id === huzurId && b.event_date === eventDate && (b.status === 'pending' || b.status === 'confirmed')
  );
}

/**
 * Finds the nearest N open dates for a Huzur when a conflict occurs.
 * Scans forward starting from the day after targetDate.
 */
export async function findNearestOpenDates(
  client: SupabaseClient<Database>,
  huzurId: string,
  targetDate: string,
  count = 5
): Promise<string[]> {
  const bookedRecords = await fetchConfirmedBookingsForConflictCheck(client, huzurId);
  const bookedSet = new Set(bookedRecords.map((r) => r.event_date));

  const openDates: string[] = [];
  const base = new Date(targetDate);
  if (isNaN(base.getTime())) {
    return [];
  }

  // Check up to 90 days ahead
  for (let i = 1; i <= 90; i++) {
    const nextDate = new Date(base);
    nextDate.setDate(nextDate.getDate() + i);

    const year = nextDate.getFullYear();
    const month = String(nextDate.getMonth() + 1).padStart(2, '0');
    const day = String(nextDate.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    if (!bookedSet.has(dateStr)) {
      openDates.push(dateStr);
      if (openDates.length >= count) {
        break;
      }
    }
  }

  return openDates;
}

export async function fetchBookingsByHuzur(
  client: SupabaseClient<Database>,
  huzurId: string,
  limit = 50,
  offset = 0
): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error, count } = await client
        .from('bookings')
        .select('*, organizer:organizers(*), division:divisions(*), district:districts(*), upazila:upazilas(*)', {
          count: 'exact',
        })
        .eq('huzur_id', huzurId)
        .order('event_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          bookings: (data as unknown as BookingWithDetails[]) ?? [],
          total: count ?? 0,
        };
      }
    } catch (err) {
      console.warn('Supabase fetchBookingsByHuzur error:', err);
    }
  }

  // Fallback in-memory
  const matched = IN_MEMORY_BOOKINGS.filter((b) => b.huzur_id === huzurId);
  return {
    bookings: matched.slice(offset, offset + limit),
    total: matched.length,
  };
}

export async function fetchBookingsByOrganizer(
  client: SupabaseClient<Database>,
  organizerId: string,
  limit = 50,
  offset = 0
): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error, count } = await client
        .from('bookings')
        .select('*, huzur:huzurs(*), division:divisions(*), district:districts(*), upazila:upazilas(*)', {
          count: 'exact',
        })
        .eq('organizer_id', organizerId)
        .order('event_date', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          bookings: (data as unknown as BookingWithDetails[]) ?? [],
          total: count ?? 0,
        };
      }
    } catch (err) {
      console.warn('Supabase fetchBookingsByOrganizer error:', err);
    }
  }

  const matched = IN_MEMORY_BOOKINGS.filter((b) => b.organizer_id === organizerId);
  return {
    bookings: matched.slice(offset, offset + limit),
    total: matched.length,
  };
}

export async function insertBookingRequest(
  client: SupabaseClient<Database>,
  booking: Inserts<'bookings'>
): Promise<{ booking: Booking | null; error: string | null }> {
  if (isRealSupabaseConfigured()) {
    const { data, error } = await (client.from('bookings') as unknown as {
      insert: (b: unknown) => { select: (s: string) => { single: () => Promise<{ data: Booking | null; error: { code?: string; message: string } | null }> } };
    })
      .insert(booking)
      .select('*')
      .single();

    if (error) {
      // PostgreSQL exclusion_violation from btree_gist EXCLUDE constraint
      if (error.code === '23P01') {
        return {
          booking: null,
          error: 'Postgres EXCLUDE violation (23P01): This Huzur already has a pending or confirmed booking on this date.',
        };
      }
      return { booking: null, error: error.message };
    }

    return { booking: data, error: null };
  }

  // Fallback in-memory
  const hasConflict = IN_MEMORY_BOOKINGS.some(
    (b) => b.huzur_id === booking.huzur_id && b.event_date === booking.event_date && (b.status === 'pending' || b.status === 'confirmed')
  );

  if (hasConflict) {
    return {
      booking: null,
      error: 'Postgres EXCLUDE violation (23P01): This Huzur already has a pending or confirmed booking on this date.',
    };
  }

  const extraFields = booking as Record<string, unknown>;
  const newBooking: BookingWithDetails = {
    id: booking.id || `c-${Date.now()}`,
    huzur_id: booking.huzur_id,
    organizer_id: booking.organizer_id,
    event_date: booking.event_date,
    venue_address: booking.venue_address,
    division_id: booking.division_id ?? null,
    district_id: booking.district_id ?? null,
    upazila_id: booking.upazila_id ?? null,
    event_details: booking.event_details ?? null,
    status: (booking.status as BookingStatus) || 'pending',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    session_slot: (extraFields.session_slot as SessionSlot) || 'after_esha',
    mahfil_name: (extraFields.mahfil_name as string) || 'ওয়াজ মাহফিল',
    district: 'ঢাকা',
  };

  IN_MEMORY_BOOKINGS.unshift(newBooking);
  return { booking: newBooking as unknown as Booking, error: null };
}

export async function updateBookingStatus(
  client: SupabaseClient<Database>,
  bookingId: string,
  status: BookingStatus
): Promise<{ booking: Booking | null; error: string | null }> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await (client.from('bookings') as unknown as {
        update: (u: unknown) => { eq: (col: string, val: string) => { select: (s: string) => { single: () => Promise<{ data: Booking | null; error: { message: string } | null }> } } };
      })
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', bookingId)
        .select('*')
        .single();

      if (error) {
        return { booking: null, error: error.message };
      }
      return { booking: data, error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Update failed';
      return { booking: null, error: message };
    }
  }

  // In-memory update
  const idx = IN_MEMORY_BOOKINGS.findIndex((b) => b.id === bookingId);
  if (idx !== -1) {
    IN_MEMORY_BOOKINGS[idx] = {
      ...IN_MEMORY_BOOKINGS[idx],
      status,
      updated_at: new Date().toISOString(),
    };
    return { booking: IN_MEMORY_BOOKINGS[idx] as unknown as Booking, error: null };
  }

  return { booking: null, error: 'Booking not found' };
}

export async function createNotification(
  client: SupabaseClient<Database>,
  notification: {
    userId: string;
    type: string;
    message: string;
    relatedBookingId?: string | null;
  }
): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const { error } = await (client.from('notifications') as unknown as {
        insert: (n: unknown) => Promise<{ error: Error | null }>;
      }).insert({
        user_id: notification.userId,
        type: notification.type,
        message: notification.message,
        related_booking_id: notification.relatedBookingId || null,
        is_read: false,
      });
      return !error;
    } catch (err) {
      console.warn('Error inserting notification:', err);
      return false;
    }
  }

  return true;
}
