import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { revalidateTag, revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { fetchHuzursForVerification, updateHuzurVerification } from '@/lib/queries/admin';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const huzurs = await fetchHuzursForVerification(supabase);
    return NextResponse.json({ data: huzurs });
  } catch (err: any) {
    console.error('API Admin Huzurs GET Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch huzur queue' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { huzur_id, is_verified } = body;

    if (!huzur_id || typeof is_verified !== 'boolean') {
      return NextResponse.json(
        { error: 'huzur_id and boolean is_verified are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const result = await updateHuzurVerification(supabase, huzur_id, is_verified);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to update verification status' },
        { status: 400 }
      );
    }

    try {
      revalidateTag(`huzur-${huzur_id}`, 'max');
    } catch {}

    try {
      revalidatePath(`/bn/huzur/${huzur_id}`);
      revalidatePath(`/en/huzur/${huzur_id}`);
      revalidatePath('/bn/search');
      revalidatePath('/en/search');
    } catch {}

    return NextResponse.json({ success: true, is_verified });
  } catch (err: any) {
    console.error('API Admin Huzurs PATCH Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
