import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchDivisions, fetchDistricts, fetchUpazilas } from '@/lib/queries/locations';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || 'divisions';
  const divisionId = searchParams.get('divisionId');
  const districtId = searchParams.get('districtId');

  const supabase = await createClient();

  if (type === 'districts') {
    const districts = await fetchDistricts(supabase, divisionId ? parseInt(divisionId, 10) : undefined);
    return NextResponse.json({ data: districts });
  }

  if (type === 'upazilas') {
    const upazilas = await fetchUpazilas(supabase, districtId ? parseInt(districtId, 10) : undefined);
    return NextResponse.json({ data: upazilas });
  }

  const divisions = await fetchDivisions(supabase);
  return NextResponse.json({ data: divisions });
}
