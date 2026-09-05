import { NextResponse, type NextRequest } from 'next/server';
import { searchHuzurs } from '@/lib/queries/searchHuzurs';
import { createPublicClient } from '@/lib/supabase/public';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const divisionId = searchParams.get('divisionId') ? Number(searchParams.get('divisionId')) : undefined;
    const districtId = searchParams.get('districtId') ? Number(searchParams.get('districtId')) : undefined;
    const upazilaId = searchParams.get('upazilaId') ? Number(searchParams.get('upazilaId')) : undefined;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const specialty = searchParams.get('specialty') || undefined;
    const q = searchParams.get('q') || undefined;
    const page = searchParams.get('page') ? Number(searchParams.get('page')) : 1;
    const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 12;

    const supabase = createPublicClient();
    const result = await searchHuzurs(
      {
        divisionId,
        districtId,
        upazilaId,
        startDate,
        endDate,
        specialty,
        q,
        page,
        limit,
      },
      supabase
    );

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    });
  } catch (err) {
    console.error('API /api/huzurs/search error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
