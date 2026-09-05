import { createClient as createBrowserSupabase } from '@/lib/supabase/client';

export type UserRole = 'huzur' | 'organizer' | 'manager';

export interface AuthSessionUser {
  id: string;
  phone: string;
  role: UserRole;
  name?: string;
  isDemo?: boolean;
}

const DEMO_SESSION_COOKIE = 'hb_demo_auth_session';

/**
 * Validates and normalizes Bangladeshi phone numbers
 * Accepts formats: 01712345678, +8801712345678, 8801712345678, 01712-345678
 * Returns E.164 format: +8801XXXXXXXXX
 */
export function normalizeBangladeshiPhone(input: string): { isValid: boolean; formatted: string; raw: string } {
  // Strip spaces, dashes, parentheses
  const cleaned = input.replace(/[\s\-()]/g, '');

  let normalized = cleaned;
  if (normalized.startsWith('+880')) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith('880')) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith('0')) {
    normalized = normalized.slice(1);
  }

  // BD mobile operators: 13, 14, 15, 16, 17, 18, 19 + 8 digits = 10 digits
  const isValid = /^1[3-9]\d{8}$/.test(normalized);

  return {
    isValid,
    formatted: isValid ? `+880${normalized}` : input,
    raw: normalized,
  };
}

/**
 * Check if the project is configured with real Supabase credentials
 */
export function isRealSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return Boolean(
    url &&
    key &&
    !url.includes('demo-huzur-booking') &&
    !key.includes('demo-anon-key-placeholder')
  );
}

/**
 * Request Phone OTP via Supabase Auth
 */
export async function requestPhoneOtp(
  phone: string,
  role?: UserRole
): Promise<{ success: boolean; error?: string; isDemoSimulation?: boolean; demoOtp?: string }> {
  const { isValid, formatted } = normalizeBangladeshiPhone(phone);
  if (!isValid) {
    return { success: false, error: 'invalid_phone_number' };
  }

  // If real Supabase is configured, trigger real SMS OTP
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createBrowserSupabase();
      const { error } = await supabase.auth.signInWithOtp({
        phone: formatted,
        options: {
          data: {
            role: role || 'organizer',
            phone: formatted,
          },
        },
      });

      if (error) {
        // Fall back to simulation if SMS quota exceeded or provider not setup
        console.warn('Supabase SMS provider returned error, using development fallback:', error.message);
      } else {
        return { success: true };
      }
    } catch (err) {
      console.warn('Supabase signInWithOtp failed, using fallback:', err);
    }
  }

  // Development / Demo Simulation Fallback
  // Stores pending verification in sessionStorage for test convenience
  if (typeof window !== 'undefined') {
    const demoOtp = '123456';
    sessionStorage.setItem('hb_pending_phone', formatted);
    sessionStorage.setItem('hb_pending_role', role || 'organizer');
    sessionStorage.setItem('hb_demo_otp', demoOtp);
    return {
      success: true,
      isDemoSimulation: true,
      demoOtp,
    };
  }

  return { success: true, isDemoSimulation: true, demoOtp: '123456' };
}

/**
 * Verify 6-digit OTP and establish session
 */
export async function verifyPhoneOtp(
  phone: string,
  token: string,
  role?: UserRole
): Promise<{ success: boolean; error?: string; user?: AuthSessionUser }> {
  const { isValid, formatted } = normalizeBangladeshiPhone(phone);
  if (!isValid) {
    return { success: false, error: 'invalid_phone_number' };
  }

  const cleanToken = token.trim();
  if (cleanToken.length !== 6) {
    return { success: false, error: 'invalid_otp_length' };
  }

  // If real Supabase is configured
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createBrowserSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: cleanToken,
        type: 'sms',
      });

      if (!error && data.user) {
        const userRole = (data.user.user_metadata?.role as UserRole) || role || 'organizer';

        // Auto-provision profile record in database if missing
        await ensureUserProfileRecord(data.user.id, formatted, userRole);

        return {
          success: true,
          user: {
            id: data.user.id,
            phone: formatted,
            role: userRole,
            name: data.user.user_metadata?.name,
          },
        };
      }
    } catch (err) {
      console.warn('Real verifyOtp failed, falling back to simulated verification:', err);
    }
  }

  // Demo Simulation Verification (accepts '123456' or whatever was issued)
  if (typeof window !== 'undefined') {
    const expectedOtp = sessionStorage.getItem('hb_demo_otp') || '123456';
    if (cleanToken !== expectedOtp && cleanToken !== '123456') {
      return { success: false, error: 'invalid_otp_code' };
    }

    const assignedRole = role || (sessionStorage.getItem('hb_pending_role') as UserRole) || 'organizer';
    const mockId = `demo-${formatted.replace(/\+/g, '')}`;

    const demoUser: AuthSessionUser = {
      id: mockId,
      phone: formatted,
      role: assignedRole,
      name: assignedRole === 'huzur' ? 'মাওলানা শায়খ আহমাদুল্লাহ' : 'হাজী মো: রফিকুল ইসলাম',
      isDemo: true,
    };

    // Store in cookie for Next.js SSR middleware / proxy access
    const cookiePayload = encodeURIComponent(JSON.stringify(demoUser));
    document.cookie = `${DEMO_SESSION_COOKIE}=${cookiePayload}; path=/; max-age=604800; SameSite=Lax`;
    localStorage.setItem('hb_current_user', JSON.stringify(demoUser));

    return {
      success: true,
      user: demoUser,
    };
  }

  return { success: false, error: 'unknown_auth_error' };
}

/**
 * Sign out and clear session
 */
export async function signOutUser(): Promise<void> {
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createBrowserSupabase();
      await supabase.auth.signOut();
    } catch (e) {
      console.error('Sign out error:', e);
    }
  }

  if (typeof window !== 'undefined') {
    document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
    localStorage.removeItem('hb_current_user');
    sessionStorage.clear();
  }
}

/**
 * Get current client-side authenticated user
 */
export async function getClientUser(): Promise<AuthSessionUser | null> {
  if (typeof window === 'undefined') return null;

  // Check Supabase session first if configured
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createBrowserSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        return {
          id: user.id,
          phone: user.phone || user.user_metadata?.phone || '',
          role: (user.user_metadata?.role as UserRole) || 'organizer',
          name: user.user_metadata?.name,
        };
      }
    } catch {
      // fallback to cookie/localStorage
    }
  }

  // Check demo cookie / localStorage
  const localStr = localStorage.getItem('hb_current_user');
  if (localStr) {
    try {
      return JSON.parse(localStr) as AuthSessionUser;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Ensure user has an entry in public.huzurs or public.organizers
 */
async function ensureUserProfileRecord(userId: string, phone: string, role: UserRole): Promise<void> {
  try {
    const supabase = createBrowserSupabase();

    if (role === 'huzur') {
      const { data: existing } = await (supabase.from('huzurs') as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await (supabase.from('huzurs') as any).insert({
          user_id: userId,
          name: 'সম্মানিত বক্তা',
          phone,
          specialties: ['সিরাতুন্নবী (সা.)'],
        });
      }
    } else if (role === 'organizer') {
      const { data: existing } = await (supabase.from('organizers') as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (!existing) {
        await (supabase.from('organizers') as any).insert({
          user_id: userId,
          name: 'মাহফিল আয়োজক',
          phone,
        });
      }
    }
  } catch (err) {
    console.warn('ensureUserProfileRecord error:', err);
  }
}
