import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { updateBookingStatus } from '@/lib/queries/bookings';
import { insertNotificationRecord } from '@/lib/queries/notifications';
import { sendSms } from '@/lib/sms';
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

    // Trigger notification and SMS delivery to Organizer upon confirmation or rejection
    if (status === 'confirmed' || status === 'rejected') {
      try {
        const { data: orgData } = await supabase
          .from('organizers')
          .select('user_id, phone, name')
          .eq('id', booking.organizer_id)
          .single();

        const orgUserId = (orgData as any)?.user_id || 'b1111111-1111-1111-1111-111111111111';
        const orgPhone = (orgData as any)?.phone || '+8801811111111';
        const notifType = status === 'confirmed' ? 'booking_confirmed' : 'booking_rejected';
        const notifMessage =
          status === 'confirmed'
            ? `আলহামদুলিল্লাহ! আপনার মাহফিল বুকিং আবেদনটি নিশ্চিত করা হয়েছে (${booking.event_date} - ${booking.venue_address})`
            : `দুঃখিত, আপনার মাহফিল বুকিং আবেদনটি বাতিল করা হয়েছে (${booking.event_date})`;

        await insertNotificationRecord(supabase, {
          userId: orgUserId,
          type: notifType,
          message: notifMessage,
          relatedBookingId: booking.id,
          sentAt: new Date().toISOString(),
        });

        if (orgPhone) {
          await sendSms({
            to: orgPhone,
            text: notifMessage,
            bookingId: booking.id,
            metadata: { type: notifType, status },
          });
        }
      } catch (notifErr) {
        console.warn('Status change notification warning:', notifErr);
      }
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
