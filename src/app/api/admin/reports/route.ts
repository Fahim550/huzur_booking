import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { fetchAdminMetrics } from '@/lib/queries/admin';

export const dynamic = 'force-dynamic';

const PRIVATE_HEADERS = {
  'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
};

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const metrics = await fetchAdminMetrics(supabase);
    return NextResponse.json({ data: metrics }, { headers: PRIVATE_HEADERS });
  } catch (err: any) {
    console.error('API Admin Reports Error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to fetch admin metrics' },
      { status: 500 }
    );
  }
}
