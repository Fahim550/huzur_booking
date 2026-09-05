import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { updateBookingStatus } from '@/lib/queries/bookings';
import type { BookingStatus } from '@/types/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body as { status: BookingStatus };

    if (!status || !['confirmed', 'rejected', 'cancelled', 'completed', 'pending'].includes(status)) {
      return NextResponse.json(
        { error: 'Valid status is required (confirmed, rejected, cancelled, completed)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { booking, error } = await updateBookingStatus(supabase, id, status);

    if (error || !booking) {
      return NextResponse.json({ error: error || 'Failed to update booking status' }, { status: 400 });
    }

    // Revalidate huzur profile, calendar, and search listings
    try {
      revalidateTag('search-results', 'max');
      if (booking.huzur_id) {
        revalidateTag(`huzur-${booking.huzur_id}`, 'max');
      }
    } catch (revalErr) {
      console.warn('Revalidate error:', revalErr);
    }

    try {
      if (booking.huzur_id) {
        revalidatePath(`/bn/huzur/${booking.huzur_id}`);
        revalidatePath(`/en/huzur/${booking.huzur_id}`);
        revalidatePath(`/huzur/${booking.huzur_id}`);
      }
      revalidatePath('/bn/search');
      revalidatePath('/en/search');
      revalidatePath('/search');
      revalidatePath('/bn/dashboard/calendar');
      revalidatePath('/en/dashboard/calendar');
      revalidatePath('/bn/my-bookings');
      revalidatePath('/en/my-bookings');
    } catch {}

    return NextResponse.json({ data: booking });
  } catch (err) {
    console.error('API booking PATCH error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
