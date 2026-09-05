import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  fetchBookingsByHuzur,
  fetchBookingsByOrganizer,
  insertBookingRequest,
  fetchConfirmedBookingsForConflictCheck,
} from '@/lib/queries/bookings';
import type { Inserts } from '@/types/database';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const huzurId = searchParams.get('huzurId');
  const organizerId = searchParams.get('organizerId');
  const conflictCheckOnly = searchParams.get('conflictCheck') === 'true';

  const supabase = await createClient();

  if (conflictCheckOnly && huzurId) {
    const dates = await fetchConfirmedBookingsForConflictCheck(supabase, huzurId);
    return NextResponse.json({ data: dates });
  }

  if (huzurId) {
    const result = await fetchBookingsByHuzur(supabase, huzurId);
    return NextResponse.json(result);
  }

  if (organizerId) {
    const result = await fetchBookingsByOrganizer(supabase, organizerId);
    return NextResponse.json(result);
  }

  return NextResponse.json({ error: 'huzurId or organizerId is required' }, { status: 400 });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Inserts<'bookings'>;
    const supabase = await createClient();

    const { booking, error } = await insertBookingRequest(supabase, body);

    if (error) {
      const isConflict = error.includes('23P01') || error.includes('EXCLUDE');
      return NextResponse.json(
        { error },
        { status: isConflict ? 409 : 400 }
      );
    }

    return NextResponse.json({ data: booking }, { status: 201 });
  } catch (err) {
    console.error('API booking create error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
