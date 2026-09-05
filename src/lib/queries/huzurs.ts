import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Huzur, HuzurWithDetails } from '@/types/database';
import { isRealSupabaseConfigured } from '@/lib/auth';

export interface HuzurSearchParams {
  districtId?: number;
  specialty?: string;
  query?: string;
  limit?: number;
  offset?: number;
}

export async function fetchVerifiedHuzurs(
  client: SupabaseClient<Database>,
  params: HuzurSearchParams = {}
): Promise<{ huzurs: HuzurWithDetails[]; total: number }> {
  const { districtId, specialty, query, limit = 20, offset = 0 } = params;

  if (isRealSupabaseConfigured()) {
    try {
      let dbQuery = client
        .from('huzurs')
        .select('*, home_district:districts(*)', { count: 'exact' })
        .eq('is_verified', true);

      if (districtId) {
        dbQuery = dbQuery.eq('home_district_id', districtId);
      }

      if (specialty) {
        dbQuery = dbQuery.contains('specialties', [specialty]);
      }

      if (query) {
        dbQuery = dbQuery.ilike('name', `%${query}%`);
      }

      const { data, error, count } = await dbQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          huzurs: (data as unknown as HuzurWithDetails[]) ?? [],
          total: count ?? 0,
        };
      }
    } catch (e) {
      console.warn('fetchVerifiedHuzurs remote error:', e);
    }
  }

  return { huzurs: [], total: 0 };
}

export async function fetchHuzurById(
  client: SupabaseClient<Database>,
  id: string
): Promise<HuzurWithDetails | null> {
  if (isRealSupabaseConfigured()) {
    try {
      const { data, error } = await client
        .from('huzurs')
        .select('*, home_district:districts(*), availability_posts(*)')
        .eq('id', id)
        .single();

      if (!error && data) {
        return data as unknown as HuzurWithDetails;
      }
    } catch (err) {
      console.warn('fetchHuzurById remote error:', err);
    }
  }

  return null;
}
