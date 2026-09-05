import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchVerifiedHuzurs, fetchHuzurById } from '@/lib/queries/huzurs';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const id = searchParams.get('id');

  const supabase = await createClient();

  if (id) {
    const huzur = await fetchHuzurById(supabase, id);
    if (!huzur) {
      return NextResponse.json({ error: 'Huzur not found' }, { status: 404 });
    }
    return NextResponse.json({ data: huzur });
  }

  const districtId = searchParams.get('districtId');
  const specialty = searchParams.get('specialty') || undefined;
  const query = searchParams.get('q') || undefined;
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  const result = await fetchVerifiedHuzurs(supabase, {
    districtId: districtId ? parseInt(districtId, 10) : undefined,
    specialty,
    query,
    limit,
    offset,
  });

  return NextResponse.json(result);
}
