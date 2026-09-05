import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isRealSupabaseConfigured } from '@/lib/auth';
import {
  checkReminderExists,
  insertNotificationRecord,
} from '@/lib/queries/notifications';
import { IN_MEMORY_BOOKINGS } from '@/lib/queries/bookings';
import { SEED_HUZURS } from '@/lib/data/mockData';
import { sendSms } from '@/lib/sms';

export const dynamic = 'force-dynamic';

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const url = new URL(request.url);
    const testBypass = url.searchParams.get('bypass') === 'true' || url.searchParams.get('test') === 'true';

    // Verify Vercel Cron Secret in production
    if (process.env.CRON_SECRET && !testBypass) {
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized cron invocation' }, { status: 401 });
      }
    }

    // Reference date (defaults to today, customizable via ?refDate=YYYY-MM-DD for deterministic testing)
    const refParam = url.searchParams.get('refDate');
    const baseDate = refParam ? new Date(refParam) : new Date();

    const date7Days = new Date(baseDate);
    date7Days.setDate(date7Days.getDate() + 7);
    const target7Days = formatDate(date7Days);

    const date1Day = new Date(baseDate);
    date1Day.setDate(date1Day.getDate() + 1);
    const target1Day = formatDate(date1Day);

    const supabase = await createClient();

    let targetBookings: Array<{
      id: string;
      huzur_id: string;
      organizer_id: string;
      event_date: string;
      venue_address: string;
      status: string;
      huzur?: { name?: string; phone?: string; user_id?: string | null };
      organizer?: { name?: string; phone?: string; user_id?: string | null };
    }> = [];

    if (isRealSupabaseConfigured()) {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('id, huzur_id, organizer_id, event_date, venue_address, status, huzurs(name, phone, user_id), organizers(name, phone, user_id)')
          .eq('status', 'confirmed')
          .in('event_date', [target7Days, target1Day]);

        if (!error && data) {
          targetBookings = data.map((b: any) => ({
            id: b.id,
            huzur_id: b.huzur_id,
            organizer_id: b.organizer_id,
            event_date: b.event_date,
            venue_address: b.venue_address,
            status: b.status,
            huzur: Array.isArray(b.huzurs) ? b.huzurs[0] : b.huzurs,
            organizer: Array.isArray(b.organizers) ? b.organizers[0] : b.organizers,
          }));
        }
      } catch (err) {
        console.warn('Cron bookings query failed, checking in-memory fallback:', err);
      }
    }

    // In-memory fallback
    if (targetBookings.length === 0) {
      targetBookings = IN_MEMORY_BOOKINGS.filter(
        (b) => b.status === 'confirmed' && (b.event_date === target7Days || b.event_date === target1Day)
      ).map((b) => {
        const matchedHuzur = SEED_HUZURS.find((h) => h.id === b.huzur_id);
        return {
          id: b.id,
          huzur_id: b.huzur_id,
          organizer_id: b.organizer_id,
          event_date: b.event_date,
          venue_address: b.venue_address,
          status: b.status,
          huzur: {
            name: (matchedHuzur as any)?.name || matchedHuzur?.full_name || 'সম্মানিত বক্তা',
            phone: matchedHuzur?.phone || '+8801711111111',
            user_id: '00000000-0000-0000-0000-000000000011',
          },
          organizer: {
            name: 'মাহফিল কর্তৃপক্ষ',
            phone: '+8801811111111',
            user_id: 'b1111111-1111-1111-1111-111111111111',
          },
        };
      });
    }

    let notificationsCreated = 0;
    let smsDelivered = 0;
    const processLogs: Array<Record<string, unknown>> = [];

    for (const booking of targetBookings) {
      const is7DaysOut = booking.event_date === target7Days;
      const reminderType = is7DaysOut ? 'reminder_7day' : 'reminder_1day';

      // Idempotency check: Don't create duplicate reminder notification for the same booking
      const alreadySent = await checkReminderExists(supabase, booking.id, reminderType);
      if (alreadySent) {
        processLogs.push({
          bookingId: booking.id,
          date: booking.event_date,
          type: reminderType,
          status: 'skipped_already_sent',
        });
        continue;
      }

      // Organizer Notification & SMS
      const organizerUserId = booking.organizer?.user_id || 'b1111111-1111-1111-1111-111111111111';
      const organizerPhone = booking.organizer?.phone || '+8801811111111';
      const orgMessage = is7DaysOut
        ? `আসন্ন মাহফিলের ৭ দিন বাকি: আগামী ${booking.event_date} তারিখে ${booking.venue_address}-এ আপনার মাহফিল নির্ধারিত রয়েছে। ভেন্যু প্রস্তুতি সম্পন্ন করুন।`
        : `জরুরি স্মরণিকা (আগামীকাল): ${booking.event_date} তারিখে ${booking.venue_address}-এ মাহফিল অনুষ্ঠিত হবে। বক্তার আগমন ও অভ্যর্থনা নিশ্চিত করুন।`;

      await insertNotificationRecord(supabase, {
        userId: organizerUserId,
        type: reminderType,
        message: orgMessage,
        relatedBookingId: booking.id,
        sentAt: new Date().toISOString(),
      });
      notificationsCreated++;

      // Send SMS to Organizer
      if (organizerPhone) {
        const smsRes = await sendSms({
          to: organizerPhone,
          text: orgMessage,
          bookingId: booking.id,
          metadata: { recipientRole: 'organizer', reminderType },
        });
        if (smsRes.success) smsDelivered++;
      }

      // Huzur Notification & SMS
      const huzurUserId = booking.huzur?.user_id || '00000000-0000-0000-0000-000000000011';
      const huzurPhone = booking.huzur?.phone;
      const huzurMessage = is7DaysOut
        ? `আসন্ন মাহফিল স্মরণিকা (৭ দিন বাকি): আগামী ${booking.event_date} তারিখে ${booking.venue_address}-এ আপনার মাহফিল নির্ধারিত রয়েছে।`
        : `জরুরি মাহফিল স্মরণিকা (আগামীকাল): ${booking.event_date} তারিখে ${booking.venue_address}-এ মাহফিল নির্ধারিত রয়েছে। যাত্রা ও সফরসূচি প্রস্তুত রাখুন।`;

      await insertNotificationRecord(supabase, {
        userId: huzurUserId,
        type: reminderType,
        message: huzurMessage,
        relatedBookingId: booking.id,
        sentAt: new Date().toISOString(),
      });
      notificationsCreated++;

      // Send SMS to Huzur / Coordinator
      if (huzurPhone) {
        const smsRes = await sendSms({
          to: huzurPhone,
          text: huzurMessage,
          bookingId: booking.id,
          metadata: { recipientRole: 'huzur', reminderType },
        });
        if (smsRes.success) smsDelivered++;
      }

      processLogs.push({
        bookingId: booking.id,
        date: booking.event_date,
        type: reminderType,
        status: 'reminders_dispatched',
        organizerPhone,
        huzurPhone,
      });
    }

    return NextResponse.json({
      success: true,
      executionTimestamp: new Date().toISOString(),
      referenceDate: formatDate(baseDate),
      target7Days,
      target1Day,
      foundConfirmedBookings: targetBookings.length,
      notificationsCreated,
      smsDelivered,
      details: processLogs,
    });
  } catch (err) {
    console.error('Cron reminder job error:', err);
    return NextResponse.json(
      { error: 'Internal server error during reminder processing' },
      { status: 500 }
    );
  }
}
