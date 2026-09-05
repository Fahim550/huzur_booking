import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Division, District, Upazila } from '@/types/database';

export async function fetchDivisions(client: SupabaseClient<Database>): Promise<Division[]> {
  const { data, error } = await client
    .from('divisions')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching divisions:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchDistricts(
  client: SupabaseClient<Database>,
  divisionId?: number
): Promise<District[]> {
  let query = client.from('districts').select('*').order('name', { ascending: true });

  if (divisionId) {
    query = query.eq('division_id', divisionId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching districts:', error);
    return [];
  }
  return data ?? [];
}

export async function fetchUpazilas(
  client: SupabaseClient<Database>,
  districtId?: number
): Promise<Upazila[]> {
  let query = client.from('upazilas').select('*').order('name', { ascending: true });

  if (districtId) {
    query = query.eq('district_id', districtId);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Error fetching upazilas:', error);
    return [];
  }
  return data ?? [];
}
