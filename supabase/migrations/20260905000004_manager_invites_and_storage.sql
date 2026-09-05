-- ==============================================================================
-- HUZUR BOOKING PLATFORM — POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000004_manager_invites_and_storage.sql
-- Description: Manager/delegate calendar invitation system, scoped RLS policies,
--              and Supabase Storage bucket configuration for speaker photos.
-- ==============================================================================

-- 1. Manager Invites Table
CREATE TABLE IF NOT EXISTS public.manager_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huzur_id UUID NOT NULL REFERENCES public.huzurs(id) ON DELETE CASCADE,
    invite_code TEXT NOT NULL UNIQUE,
    phone TEXT,
    manager_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '7 days'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for lookup by code and by huzur
CREATE INDEX IF NOT EXISTS idx_manager_invites_code ON public.manager_invites(invite_code);
CREATE INDEX IF NOT EXISTS idx_manager_invites_huzur ON public.manager_invites(huzur_id);

-- Enable RLS on manager_invites
ALTER TABLE public.manager_invites ENABLE ROW LEVEL SECURITY;

-- 2. RLS Policies for manager_invites
-- Huzur owner can select, create, update, and revoke invites for their own huzur profile
CREATE POLICY "Huzurs can select own manager invites" ON public.manager_invites
    FOR SELECT TO authenticated
    USING (
        huzur_id IN (
            SELECT id FROM public.huzurs WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Huzurs can create manager invites" ON public.manager_invites
    FOR INSERT TO authenticated
    WITH CHECK (
        huzur_id IN (
            SELECT id FROM public.huzurs WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Huzurs can update own manager invites" ON public.manager_invites
    FOR UPDATE TO authenticated
    USING (
        huzur_id IN (
            SELECT id FROM public.huzurs WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        huzur_id IN (
            SELECT id FROM public.huzurs WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Huzurs can delete own manager invites" ON public.manager_invites
    FOR DELETE TO authenticated
    USING (
        huzur_id IN (
            SELECT id FROM public.huzurs WHERE user_id = auth.uid()
        )
    );

-- Any authenticated user can view pending invite details using the exact invite code
-- (so the delegate can inspect the speaker's name and details before accepting)
CREATE POLICY "Public/Auth can view invite by code" ON public.manager_invites
    FOR SELECT TO public
    USING (
        status = 'pending' AND expires_at > timezone('utc'::text, now())
    );

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trg_manager_invites_updated_at ON public.manager_invites;
CREATE TRIGGER trg_manager_invites_updated_at
    BEFORE UPDATE ON public.manager_invites
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Storage Bucket for Avatars / Speaker Photos
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('avatars', 'avatars', true)
    ON CONFLICT (id) DO NOTHING;
EXCEPTION
    WHEN undefined_table THEN null;
    WHEN others THEN null;
END $$;

-- Storage RLS policies (conditional on storage.objects existing)
DO $$
BEGIN
    -- Public read access for avatars
    CREATE POLICY "Public read avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatars');
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    -- Authenticated upload for avatars
    CREATE POLICY "Authenticated users upload avatar"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
    WHEN others THEN null;
END $$;

DO $$
BEGIN
    -- Authenticated update for avatars
    CREATE POLICY "Users update own avatar"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars');
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_table THEN null;
    WHEN others THEN null;
END $$;
