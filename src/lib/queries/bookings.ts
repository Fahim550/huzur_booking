import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Booking, BookingWithDetails, Inserts } from '@/types/database';

export async function fetchConfirmedBookingsForConflictCheck(
  client: SupabaseClient<Database>,
  huzurId: string
): Promise<{ event_date: string; status: string }[]> {
  const { data, error } = await client
    .from('bookings')
    .select('event_date, status')
    .eq('huzur_id', huzurId)
    .in('status', ['pending', 'confirmed']);

  if (error) {
    console.error('Error checking booking conflict dates:', error);
    return [];
  }
  return data ?? [];
}

export async function checkHuzurDateConflict(
  client: SupabaseClient<Database>,
  huzurId: string,
  eventDate: string
): Promise<boolean> {
  const { data, error } = await client
    .from('bookings')
    .select('id')
    .eq('huzur_id', huzurId)
    .eq('event_date', eventDate)
    .in('status', ['pending', 'confirmed'])
    .limit(1);

  if (error) {
    console.error('Error querying booking conflicts:', error);
    return false;
  }

  return (data?.length ?? 0) > 0;
}

export async function fetchBookingsByHuzur(
  client: SupabaseClient<Database>,
  huzurId: string,
  limit = 50,
  offset = 0
): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  const { data, error, count } = await client
    .from('bookings')
    .select('*, organizer:organizers(*), division:divisions(*), district:districts(*), upazila:upazilas(*)', {
      count: 'exact',
    })
    .eq('huzur_id', huzurId)
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching bookings by huzur:', error);
    return { bookings: [], total: 0 };
  }

  return {
    bookings: (data as unknown as BookingWithDetails[]) ?? [],
    total: count ?? 0,
  };
}

export async function fetchBookingsByOrganizer(
  client: SupabaseClient<Database>,
  organizerId: string,
  limit = 50,
  offset = 0
): Promise<{ bookings: BookingWithDetails[]; total: number }> {
  const { data, error, count } = await client
    .from('bookings')
    .select('*, huzur:huzurs(*), division:divisions(*), district:districts(*), upazila:upazilas(*)', {
      count: 'exact',
    })
    .eq('organizer_id', organizerId)
    .order('event_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching bookings by organizer:', error);
    return { bookings: [], total: 0 };
  }

  return {
    bookings: (data as unknown as BookingWithDetails[]) ?? [],
    total: count ?? 0,
  };
}

export async function insertBookingRequest(
  client: SupabaseClient<Database>,
  booking: Inserts<'bookings'>
): Promise<{ booking: Booking | null; error: string | null }> {
  const { data, error } = await (client.from('bookings') as any)
    .insert(booking)
    .select('*')
    .single();

  if (error) {
    // If error code is 23P01, it is PostgreSQL exclusion_violation from our btree_gist EXCLUDE constraint!
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
