import { createClient } from '@/lib/supabase/client';
import { isRealSupabaseConfigured } from '@/lib/auth';

export interface HuzurFormData {
  id?: string;
  name: string;
  title: string;
  photo_url?: string | null;
  institution?: string | null;
  bio?: string | null;
  specialties: string[];
  phone?: string | null;
  home_district_id?: number | null;
}

export interface OrganizerFormData {
  id?: string;
  name: string;
  phone: string;
  institution_name?: string | null;
}

export interface ManagerInviteData {
  id: string;
  huzur_id: string;
  invite_code: string;
  manager_name?: string | null;
  phone?: string | null;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expires_at: string;
  huzur_name?: string;
  huzur_title?: string;
}

// In-memory store for Node.js test environments and SSR
const inMemoryInvites: any[] = [];
const inMemoryManagers: any[] = [];

/**
 * Upload speaker photo to Supabase Storage `avatars` bucket
 */
export async function uploadSpeakerPhoto(file: File, userId: string): Promise<string> {
  const fileExt = file.name.split('.').pop() || 'jpg';
  const fileName = `speaker_${userId}_${Date.now()}.${fileExt}`;
  const filePath = `speakers/${fileName}`;

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        return publicUrlData.publicUrl;
      }
    } catch (err) {
      console.warn('Storage upload exception, using local object URL fallback:', err);
    }
  }

  return URL.createObjectURL(file);
}

/**
 * Fetch Huzur profile by User ID
 */
export async function getHuzurProfileByUserId(userId: string) {
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('huzurs') as any)
        .select('*, districts(id, name, bn_name)')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching huzur profile:', err);
    }
  }
  return null;
}

/**
 * Upsert Huzur profile
 */
export async function upsertHuzurProfile(userId: string, data: HuzurFormData) {
  const payload = {
    user_id: userId,
    name: data.name,
    photo_url: data.photo_url || null,
    institution: data.institution || null,
    bio: data.bio || null,
    specialties: data.specialties,
    phone: data.phone || null,
    home_district_id: data.home_district_id || null,
    updated_at: new Date().toISOString(),
  };

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: existing } = await (supabase.from('huzurs') as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await (supabase.from('huzurs') as any)
          .update(payload)
          .eq('id', (existing as { id: string }).id)
          .select()
          .single();

        if (!error && updated) return updated;
      } else {
        const { data: inserted, error } = await (supabase.from('huzurs') as any)
          .insert(payload)
          .select()
          .single();

        if (!error && inserted) return inserted;
      }
    } catch (err) {
      console.warn('upsertHuzurProfile real db error, falling back:', err);
    }
  }

  // Demo fallback
  return { id: `huzur-${userId}`, ...payload };
}

/**
 * Fetch Organizer profile by User ID
 */
export async function getOrganizerProfileByUserId(userId: string) {
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('organizers') as any)
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) return data;
    } catch (err) {
      console.warn('Error fetching organizer profile:', err);
    }
  }
  return null;
}

/**
 * Upsert Organizer profile
 */
export async function upsertOrganizerProfile(userId: string, data: OrganizerFormData) {
  const payload = {
    user_id: userId,
    name: data.name,
    phone: data.phone,
    institution_name: data.institution_name || null,
    updated_at: new Date().toISOString(),
  };

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data: existing } = await (supabase.from('organizers') as any)
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (existing) {
        const { data: updated, error } = await (supabase.from('organizers') as any)
          .update(payload)
          .eq('id', (existing as { id: string }).id)
          .select()
          .single();

        if (!error && updated) return updated;
      } else {
        const { data: inserted, error } = await (supabase.from('organizers') as any)
          .insert(payload)
          .select()
          .single();

        if (!error && inserted) return inserted;
      }
    } catch (err) {
      console.warn('upsertOrganizerProfile real db error, falling back:', err);
    }
  }

  // Demo fallback
  return { id: `organizer-${userId}`, ...payload };
}

/**
 * Generate a new manager/delegate invite
 */
export async function createManagerInvite(
  huzurId: string,
  managerName?: string,
  phone?: string
): Promise<{ inviteCode: string; inviteId: string }> {
  // Generate unique 6-character code: e.g. HZ-948123
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  const inviteCode = `HZ-${randomNum}`;

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('manager_invites') as any)
        .insert({
          huzur_id: huzurId,
          invite_code: inviteCode,
          manager_name: managerName || null,
          phone: phone || null,
          status: 'pending',
        })
        .select('id, invite_code')
        .single();

      if (!error && data) {
        return { inviteCode: data.invite_code, inviteId: data.id };
      }
    } catch (err) {
      console.warn('createManagerInvite error, using local fallback:', err);
    }
  }

  // Store in in-memory and localStorage for demo/test fallback
  const mockInvite = {
    id: `invite-${Date.now()}`,
    huzur_id: huzurId,
    invite_code: inviteCode,
    manager_name: managerName || null,
    phone: phone || null,
    status: 'pending' as const,
    expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
  };
  inMemoryInvites.push(mockInvite);

  if (typeof window !== 'undefined') {
    const stored = JSON.parse(localStorage.getItem('hb_demo_invites') || '[]');
    stored.push(mockInvite);
    localStorage.setItem('hb_demo_invites', JSON.stringify(stored));
  }
  return { inviteCode, inviteId: mockInvite.id };
}

/**
 * Fetch manager invite by invite code
 */
export async function getManagerInvite(inviteCode: string): Promise<ManagerInviteData | null> {
  const cleanCode = inviteCode.trim().toUpperCase();

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('manager_invites') as any)
        .select('*, huzurs(id, name)')
        .eq('invite_code', cleanCode)
        .eq('status', 'pending')
        .maybeSingle();

      if (!error && data) {
        const d = data as any;
        return {
          id: d.id,
          huzur_id: d.huzur_id,
          invite_code: d.invite_code,
          manager_name: d.manager_name,
          phone: d.phone,
          status: d.status,
          expires_at: d.expires_at,
          huzur_name: d.huzurs?.name || 'সম্মানিত বক্তা',
        };
      }
    } catch (err) {
      // fallback
    }
  }

  // Check in-memory store
  const inMem = inMemoryInvites.find((inv) => inv.invite_code.toUpperCase() === cleanCode);
  if (inMem) {
    return {
      ...inMem,
      huzur_name: 'মাওলানা শায়খ আহমাদুল্লাহ',
    };
  }

  // Check localStorage if in browser
  if (typeof window !== 'undefined') {
    const stored = JSON.parse(localStorage.getItem('hb_demo_invites') || '[]');
    const found = stored.find((inv: { invite_code: string }) => inv.invite_code.toUpperCase() === cleanCode);
    if (found) {
      return {
        ...found,
        huzur_name: 'মাওলানা শায়খ আহমাদুল্লাহ',
      };
    }
  }

  return null;
}

/**
 * Accept manager invite
 */
export async function acceptManagerInvite(
  inviteCode: string,
  managerUserId: string,
  name: string,
  phone: string
): Promise<{ success: boolean; error?: string }> {
  const invite = await getManagerInvite(inviteCode);
  if (!invite) {
    return { success: false, error: 'invalid_or_expired_invite' };
  }

  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      // 1. Insert row into public.managers
      await (supabase.from('managers') as any).insert({
        huzur_id: invite.huzur_id,
        user_id: managerUserId,
        name,
        phone,
        role: 'manager',
      });

      // 2. Mark invite as accepted
      await (supabase.from('manager_invites') as any)
        .update({ status: 'accepted' })
        .eq('id', invite.id);

      return { success: true };
    } catch (err) {
      // fallback
    }
  }

  // In-memory and localStorage updates for test/demo fallback
  invite.status = 'accepted';
  const newManager = {
    id: `mgr-${Date.now()}`,
    huzur_id: invite.huzur_id,
    user_id: managerUserId,
    name,
    phone,
    role: 'manager',
  };
  inMemoryManagers.push(newManager);

  if (typeof window !== 'undefined') {
    const demoManagers = JSON.parse(localStorage.getItem('hb_demo_managers') || '[]');
    demoManagers.push(newManager);
    localStorage.setItem('hb_demo_managers', JSON.stringify(demoManagers));
  }

  return { success: true };
}

/**
 * Fetch assigned managers for a Huzur
 */
export async function fetchHuzurManagers(huzurId: string) {
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { data, error } = await (supabase.from('managers') as any)
        .select('*')
        .eq('huzur_id', huzurId);

      if (!error && data && data.length > 0) {
        return data;
      }
    } catch (e) {
      // fallback
    }
  }

  // In-memory fallback
  const inMem = inMemoryManagers.filter((m) => m.huzur_id === huzurId);
  if (inMem.length > 0) return inMem;

  // Browser localStorage fallback
  if (typeof window !== 'undefined') {
    const demoManagers = JSON.parse(localStorage.getItem('hb_demo_managers') || '[]');
    return demoManagers.filter((m: { huzur_id: string }) => m.huzur_id === huzurId);
  }

  return [];
}

/**
 * Revoke manager access
 */
export async function revokeManager(managerId: string): Promise<boolean> {
  if (isRealSupabaseConfigured()) {
    try {
      const supabase = createClient();
      const { error } = await (supabase.from('managers') as any).delete().eq('id', managerId);
      if (!error) return true;
    } catch (e) {
      // fallback
    }
  }

  // In-memory remove
  const index = inMemoryManagers.findIndex((m) => m.id === managerId);
  if (index !== -1) {
    inMemoryManagers.splice(index, 1);
  }

  if (typeof window !== 'undefined') {
    const demoManagers = JSON.parse(localStorage.getItem('hb_demo_managers') || '[]');
    const filtered = demoManagers.filter((m: { id: string }) => m.id !== managerId);
    localStorage.setItem('hb_demo_managers', JSON.stringify(filtered));
  }

  return true;
}
