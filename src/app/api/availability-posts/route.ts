import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { isRealSupabaseConfigured } from '@/lib/auth';
import { IN_MEMORY_AVAILABILITY_POSTS, AvailabilityPostItem } from '@/lib/queries/searchHuzurs';
import type { Inserts } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const huzurId = searchParams.get('huzurId');
    const districtId = searchParams.get('districtId') ? Number(searchParams.get('districtId')) : undefined;
    const divisionId = searchParams.get('divisionId') ? Number(searchParams.get('divisionId')) : undefined;

    if (isRealSupabaseConfigured()) {
      const supabase = await createClient();
      let query = supabase.from('availability_posts').select('*').order('start_date', { ascending: true });

      if (huzurId) {
        query = query.eq('huzur_id', huzurId);
      }
      if (districtId) {
        query = query.eq('district_id', districtId);
      }
      if (divisionId) {
        query = query.eq('division_id', divisionId);
      }

      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json({ data });
      }
    }

    // In-memory fallback
    let posts = [...IN_MEMORY_AVAILABILITY_POSTS];
    if (huzurId) {
      posts = posts.filter((p) => p.huzur_id === huzurId);
    }
    if (districtId) {
      posts = posts.filter((p) => p.district_id === districtId);
    }
    if (divisionId) {
      posts = posts.filter((p) => p.division_id === divisionId);
    }

    return NextResponse.json({ data: posts });
  } catch (err) {
    console.error('API availability posts GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Inserts<'availability_posts'>;
    const { huzur_id, start_date, end_date, division_id, district_id, upazila_id, note } = body;

    if (!huzur_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'huzur_id, start_date, and end_date are required' },
        { status: 400 }
      );
    }

    if (start_date > end_date) {
      return NextResponse.json(
        { error: 'শুরুর তারিখ অবশ্যই সমাপ্তির তারিখের সমান বা পূর্ববর্তী হতে হবে।' },
        { status: 400 }
      );
    }

    if (isRealSupabaseConfigured()) {
      const supabase = await createClient();
      const { data, error } = await (supabase.from('availability_posts') as any)
        .insert({
          huzur_id,
          start_date,
          end_date,
          division_id: division_id ?? null,
          district_id: district_id ?? null,
          upazila_id: upazila_id ?? null,
          note: note ?? null,
        })
        .select('*')
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }

      // Revalidate search and huzur profile cache
      try {
        revalidateTag('search-results', 'max');
        revalidateTag('huzur-search', 'max');
        revalidateTag(`huzur-${huzur_id}`, 'max');
      } catch (revalErr) {
        console.warn('Revalidate error:', revalErr);
      }

      try {
        revalidatePath('/bn/search');
        revalidatePath('/en/search');
        revalidatePath(`/bn/huzur/${huzur_id}`);
        revalidatePath(`/en/huzur/${huzur_id}`);
      } catch {}

      return NextResponse.json({ data }, { status: 201 });
    }

    // In-memory fallback
    const newPost: AvailabilityPostItem = {
      id: `post-${Date.now()}`,
      huzur_id,
      start_date,
      end_date,
      division_id: division_id ?? null,
      district_id: district_id ?? null,
      upazila_id: upazila_id ?? null,
      note: note ?? null,
    };

    IN_MEMORY_AVAILABILITY_POSTS.unshift(newPost);

    return NextResponse.json({ data: newPost }, { status: 201 });
  } catch (err) {
    console.error('API availability posts POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
