import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { rateLimit } from '@/lib/rateLimit';
import {
  fetchBookingsByHuzur,
  fetchBookingsByOrganizer,
  insertBookingRequest,
  fetchConfirmedBookingsForConflictCheck,
  checkHuzurDateConflict,
  findNearestOpenDates,
  createNotification,
} from '@/lib/queries/bookings';
import type { Inserts } from '@/types/database';

export const dynamic = 'force-dynamic';

const PRIVATE_CACHE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const huzurId = searchParams.get('huzurId');
  const organizerId = searchParams.get('organizerId');
  const conflictCheckOnly = searchParams.get('conflictCheck') === 'true';

  const supabase = await createClient();

  if (conflictCheckOnly && huzurId) {
    const dates = await fetchConfirmedBookingsForConflictCheck(supabase, huzurId);
    return NextResponse.json({ data: dates }, { headers: PRIVATE_CACHE_HEADERS });
  }

  if (huzurId) {
    const result = await fetchBookingsByHuzur(supabase, huzurId);
    return NextResponse.json(result, { headers: PRIVATE_CACHE_HEADERS });
  }

  if (organizerId) {
    const result = await fetchBookingsByOrganizer(supabase, organizerId);
    return NextResponse.json(result, { headers: PRIVATE_CACHE_HEADERS });
  }

  return NextResponse.json({ error: 'huzurId or organizerId is required' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Inserts<'bookings'> & {
      mahfil_name?: string;
      session_slot?: string;
      contact_person_name?: string;
      contact_phone?: string;
      hadya_offered?: number;
    };

    const { huzur_id, event_date, venue_address } = body;

    if (!huzur_id || !event_date || !venue_address) {
      return NextResponse.json(
        { error: 'huzur_id, event_date, and venue_address are required' },
        { status: 400 }
      );
    }

    // Rate limiting: 5 requests per hour per phone number or IP
    const phone = body.contact_phone || 'anonymous';
    const forwarded = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const ip = forwarded.split(',')[0].trim();
    const rateLimitKey = `${phone}_${ip}`;
    const rateCheck = await rateLimit(rateLimitKey, 5, 3600);

    if (!rateCheck.success) {
      return NextResponse.json(
        {
          error: 'অতিরিক্ত বুকিং অনুরোধ করা হয়েছে। অনুগ্রহ করে ১ ঘণ্টা পর আবার চেষ্টা করুন।',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfterSeconds: rateCheck.retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateCheck.retryAfter),
            'X-RateLimit-Limit': String(rateCheck.limit),
            'X-RateLimit-Remaining': String(rateCheck.remaining),
            'X-RateLimit-Reset': String(rateCheck.reset),
          },
        }
      );
    }

    const supabase = await createClient();

    // 1. DEFENSE IN DEPTH: Pre-check date availability in application code
    const isConflict = await checkHuzurDateConflict(supabase, huzur_id, event_date);
    if (isConflict) {
      const suggestedDates = await findNearestOpenDates(supabase, huzur_id, event_date, 5);
      return NextResponse.json(
        {
          error: 'এই তারিখে হুজুরের পূর্বনির্ধারিত মাহফিল বা অপেক্ষমাণ আবেদন রয়েছে।',
          isConflict: true,
          suggestedDates,
        },
        { status: 409 }
      );
    }

    // 2. Resolve organizer_id if not explicitly provided
    let organizerId = body.organizer_id;
    if (!organizerId) {
      // Default demo organizer id if user is in demo mode or unauthenticated public submission
      organizerId = 'b1111111-1111-1111-1111-111111111111';
    }

    // 3. Prepare booking payload
    const bookingPayload: Inserts<'bookings'> = {
      huzur_id,
      organizer_id: organizerId,
      event_date,
      division_id: body.division_id ?? null,
      district_id: body.district_id ?? null,
      upazila_id: body.upazila_id ?? null,
      venue_address,
      event_details: body.event_details || body.mahfil_name || 'ওয়াজ মাহফিল বুকিং আবেদন',
      status: 'pending',
    };

    // 4. Insert booking (enforces PostgreSQL 23P01 btree_gist EXCLUDE constraint)
    const { booking, error } = await insertBookingRequest(supabase, bookingPayload);

    if (error) {
      const isExcludeViolation = error.includes('23P01') || error.includes('EXCLUDE') || error.includes('exclusion');
      if (isExcludeViolation) {
        const suggestedDates = await findNearestOpenDates(supabase, huzur_id, event_date, 5);
        return NextResponse.json(
          {
            error: 'এই তারিখে হুজুরের পূর্বনির্ধারিত মাহফিল রয়েছে। অন্য একটি তারিখ নির্বাচন করুন।',
            isConflict: true,
            suggestedDates,
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ error }, { status: 400 });
    }

    // 5. Trigger notification insert for the Huzur / Coordinator
    try {
      // Look up huzur's user_id if available
      const { data: huzurData } = await supabase
        .from('huzurs')
        .select('user_id, name')
        .eq('id', huzur_id)
        .single();

      const targetUserId = (huzurData as any)?.user_id || '00000000-0000-0000-0000-000000000011';
      await createNotification(supabase, {
        userId: targetUserId,
        type: 'booking_request',
        message: `নতুন মাহফিল বুকিং অনুরোধ এসেছে: ${event_date} তারিখে ${venue_address}`,
        relatedBookingId: booking?.id || null,
      });
    } catch (notifErr) {
      console.warn('Notification trigger warning:', notifErr);
    }

    // 6. Invalidate edge, profile, and search cache tags immediately
    try {
      revalidateTag('search-results', 'max');
      revalidateTag(`huzur-${huzur_id}`, 'max');
    } catch (revalErr) {
      console.warn('Revalidate error:', revalErr);
    }

    try {
      revalidatePath('/bn/search');
      revalidatePath('/en/search');
      revalidatePath('/search');
      revalidatePath(`/bn/huzur/${huzur_id}`);
      revalidatePath(`/en/huzur/${huzur_id}`);
      revalidatePath(`/huzur/${huzur_id}`);
      revalidatePath('/bn/dashboard/calendar');
      revalidatePath('/en/dashboard/calendar');
    } catch {}

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (err) {
    console.error('API booking create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
