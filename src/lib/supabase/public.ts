import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

/**
 * Creates a stateless Supabase client using public credentials.
 * Does NOT read from or write to `cookies()` from `next/headers`.
 * 
 * Crucial for Next.js ISR (Incremental Static Regeneration):
 * Reading cookies in Server Components opts the page into dynamic runtime rendering.
 * Using this client allows public, read-only pages (e.g. Huzur Profile) to be prerendered
 * as static pages at build time and regenerated on the ISR revalidation interval.
 */
export function createPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://demo-huzur-booking.supabase.co';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'demo-anon-key-placeholder';

  return createSupabaseClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
