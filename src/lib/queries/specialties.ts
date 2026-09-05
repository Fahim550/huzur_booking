import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Specialty } from '@/types/database';

export async function fetchSpecialties(client: SupabaseClient<Database>): Promise<Specialty[]> {
  const { data, error } = await client
    .from('specialties')
    .select('*')
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching specialties:', error);
    return [];
  }
  return data ?? [];
}
