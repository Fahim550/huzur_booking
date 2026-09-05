import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createPublicClient } from '@/lib/supabase/public';
import { fetchDivisions, fetchDistricts, fetchUpazilas } from '@/lib/queries/locations';

// Static reference data: Revalidate once per 24 hours (86400s)
export const revalidate = 86400;

const CACHE_HEADERS = {
  'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'divisions';
  const divisionId = searchParams.get('divisionId');
  const districtId = searchParams.get('districtId');

  const supabase = createPublicClient();

  if (type === 'districts') {
    const districts = await fetchDistricts(supabase, divisionId ? parseInt(divisionId, 10) : undefined);
    return NextResponse.json({ data: districts }, { headers: CACHE_HEADERS });
  }

  if (type === 'upazilas') {
    const upazilas = await fetchUpazilas(supabase, districtId ? parseInt(districtId, 10) : undefined);
    return NextResponse.json({ data: upazilas }, { headers: CACHE_HEADERS });
  }

  const divisions = await fetchDivisions(supabase);
  return NextResponse.json({ data: divisions }, { headers: CACHE_HEADERS });
}

