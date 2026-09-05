-- ==============================================================================
-- HUZUR BOOKING PLATFORM — POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000002_core_schema.sql
-- Description: Full schema (divisions, districts, upazilas, huzurs, managers,
--              organizers, bookings, availability_posts, notifications),
--              btree_gist extension, double-booking EXCLUDE constraint,
--              high-performance indexes, and Row Level Security (RLS) policies.
-- ==============================================================================

-- 1. Enable btree_gist extension (Mandatory for EXCLUDE constraints on UUID & DATE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Geographic Hierarchy Tables
CREATE TABLE IF NOT EXISTS public.divisions (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    bn_name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.districts (
    id SERIAL PRIMARY KEY,
    division_id INT NOT NULL REFERENCES public.divisions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bn_name TEXT NOT NULL,
    CONSTRAINT uq_districts_division_name UNIQUE (division_id, name)
);

CREATE TABLE IF NOT EXISTS public.upazilas (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES public.districts(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    bn_name TEXT NOT NULL,
    CONSTRAINT uq_upazilas_district_name UNIQUE (district_id, name)
);

-- 3. Core Actors & Profiles
CREATE TABLE IF NOT EXISTS public.huzurs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    photo_url TEXT,
    institution TEXT,
    bio TEXT,
    specialties TEXT[] NOT NULL DEFAULT '{}'::TEXT[],
    phone TEXT,
    home_district_id INT REFERENCES public.districts(id) ON DELETE SET NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE IF NOT EXISTS public.managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huzur_id UUID NOT NULL REFERENCES public.huzurs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_manager_huzur_user UNIQUE (huzur_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.organizers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    institution_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Bookings Table with Double-Booking Prevention EXCLUDE Constraint
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huzur_id UUID NOT NULL REFERENCES public.huzurs(id) ON DELETE RESTRICT,
    organizer_id UUID NOT NULL REFERENCES public.organizers(id) ON DELETE RESTRICT,
    event_date DATE NOT NULL,
    division_id INT REFERENCES public.divisions(id) ON DELETE RESTRICT,
    district_id INT REFERENCES public.districts(id) ON DELETE RESTRICT,
    upazila_id INT REFERENCES public.upazilas(id) ON DELETE SET NULL,
    venue_address TEXT NOT NULL,
    event_details TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','cancelled','completed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- EXCLUDE CONSTRAINT: Prevents race-condition concurrent bookings for the same huzur
-- on the same event_date when status is 'pending' or 'confirmed'.
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT prevent_huzur_double_booking
    EXCLUDE USING gist (
        huzur_id WITH =,
        event_date WITH =
    ) WHERE (status IN ('pending', 'confirmed'));
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN duplicate_table THEN null;
END $$;

-- 5. Availability Posts
CREATE TABLE IF NOT EXISTS public.availability_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huzur_id UUID NOT NULL REFERENCES public.huzurs(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    division_id INT REFERENCES public.divisions(id) ON DELETE SET NULL,
    district_id INT REFERENCES public.districts(id) ON DELETE SET NULL,
    upazila_id INT REFERENCES public.upazilas(id) ON DELETE SET NULL,
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT check_availability_dates CHECK (start_date <= end_date)
);

-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    related_booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    scheduled_at TIMESTAMPTZ,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. High-Traffic Performance Indexes
CREATE INDEX IF NOT EXISTS idx_bookings_huzur_event_date ON public.bookings(huzur_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_district_event_date ON public.bookings(district_id, event_date);
CREATE INDEX IF NOT EXISTS idx_availability_posts_district_dates ON public.availability_posts(district_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer_id ON public.bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_huzurs_home_district ON public.huzurs(home_district_id);
CREATE INDEX IF NOT EXISTS idx_huzurs_is_verified ON public.huzurs(is_verified);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- 8. Updated At Trigger Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_huzurs_updated_at ON public.huzurs;
CREATE TRIGGER trg_huzurs_updated_at
    BEFORE UPDATE ON public.huzurs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_organizers_updated_at ON public.organizers;
CREATE TRIGGER trg_organizers_updated_at
    BEFORE UPDATE ON public.organizers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.divisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upazilas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.huzurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9.1 Divisions, Districts, Upazilas: Public (anon and authenticated) can select
CREATE POLICY "Public read for divisions" ON public.divisions
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read for districts" ON public.districts
    FOR SELECT TO public USING (true);

CREATE POLICY "Public read for upazilas" ON public.upazilas
    FOR SELECT TO public USING (true);

-- 9.2 Huzurs:
-- Public can view verified huzurs; owners and their managers can view their own profile (verified or unverified)
CREATE POLICY "Public can select verified huzurs" ON public.huzurs
    FOR SELECT TO public
    USING (
        is_verified = true
        OR (auth.uid() IS NOT NULL AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.managers
                WHERE managers.huzur_id = huzurs.id AND managers.user_id = auth.uid()
            )
        ))
    );

-- Huzurs can create their own profile
CREATE POLICY "Authenticated users can create huzur profile" ON public.huzurs
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Huzurs and authorized managers can modify their huzur's row
CREATE POLICY "Huzurs and managers can update own huzur row" ON public.huzurs
    FOR UPDATE TO authenticated
    USING (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.managers
                WHERE managers.huzur_id = huzurs.id AND managers.user_id = auth.uid()
            )
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL AND (
            user_id = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.managers
                WHERE managers.huzur_id = huzurs.id AND managers.user_id = auth.uid()
            )
        )
    );

-- 9.3 Managers:
-- Managers can view their own assignment; Huzur owner can view all their managers
CREATE POLICY "Managers and Huzurs can select manager records" ON public.managers
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.huzurs
            WHERE huzurs.id = managers.huzur_id AND huzurs.user_id = auth.uid()
        )
    );

-- Only Huzur owner can insert, update, or delete delegate managers
CREATE POLICY "Huzur owner can manage delegate managers" ON public.managers
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.huzurs
            WHERE huzurs.id = managers.huzur_id AND huzurs.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.huzurs
            WHERE huzurs.id = managers.huzur_id AND huzurs.user_id = auth.uid()
        )
    );

-- 9.4 Organizers:
-- Organizers can see/modify their own profile. Huzurs/managers can see organizer info for their bookings.
-- Public anon CANNOT see organizer contact info.
CREATE POLICY "Organizers view own profile or booking partners" ON public.organizers
    FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.bookings b
            JOIN public.huzurs h ON b.huzur_id = h.id
            LEFT JOIN public.managers m ON m.huzur_id = h.id
            WHERE b.organizer_id = public.organizers.id
              AND (h.user_id = auth.uid() OR m.user_id = auth.uid())
        )
    );

CREATE POLICY "Organizers create own profile" ON public.organizers
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Organizers update own profile" ON public.organizers
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 9.5 Bookings:
-- 1. Organizers can only see their own booking requests.
CREATE POLICY "Organizers see own bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        organizer_id IN (
            SELECT id FROM public.organizers WHERE user_id = auth.uid()
        )
    );

-- 2. Huzurs/managers can see their assigned bookings.
CREATE POLICY "Huzurs and managers see assigned bookings" ON public.bookings
    FOR SELECT TO authenticated
    USING (
        huzur_id IN (SELECT id FROM public.huzurs WHERE user_id = auth.uid())
        OR huzur_id IN (SELECT huzur_id FROM public.managers WHERE user_id = auth.uid())
    );

-- 3. Public (anon + authenticated) can SELECT confirmed booking dates for conflict-checking.
-- Note: Organizer contact details (name, phone, institution) reside in public.organizers which is hidden from anon.
CREATE POLICY "Public can select confirmed bookings for conflict checking" ON public.bookings
    FOR SELECT TO public
    USING (status = 'confirmed');

-- 4. Organizers can insert new booking requests for themselves.
CREATE POLICY "Organizers can create booking requests" ON public.bookings
    FOR INSERT TO authenticated
    WITH CHECK (
        organizer_id IN (
            SELECT id FROM public.organizers WHERE user_id = auth.uid()
        )
    );

-- 5. Huzurs/managers can modify their own huzur's rows (e.g. confirm, reject, complete).
CREATE POLICY "Huzurs and managers can modify booking status" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        huzur_id IN (SELECT id FROM public.huzurs WHERE user_id = auth.uid())
        OR huzur_id IN (SELECT huzur_id FROM public.managers WHERE user_id = auth.uid())
    )
    WITH CHECK (
        huzur_id IN (SELECT id FROM public.huzurs WHERE user_id = auth.uid())
        OR huzur_id IN (SELECT huzur_id FROM public.managers WHERE user_id = auth.uid())
    );

-- 6. Organizers can cancel their own pending/confirmed booking requests.
CREATE POLICY "Organizers can cancel own bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        organizer_id IN (
            SELECT id FROM public.organizers WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organizer_id IN (
            SELECT id FROM public.organizers WHERE user_id = auth.uid()
        )
    );

-- 9.6 Availability Posts:
-- Public can view all availability posts
CREATE POLICY "Public can select availability posts" ON public.availability_posts
    FOR SELECT TO public
    USING (true);

-- Huzurs and managers can create, update, or delete availability posts
CREATE POLICY "Huzurs and managers can manage availability posts" ON public.availability_posts
    FOR ALL TO authenticated
    USING (
        huzur_id IN (SELECT id FROM public.huzurs WHERE user_id = auth.uid())
        OR huzur_id IN (SELECT huzur_id FROM public.managers WHERE user_id = auth.uid())
    )
    WITH CHECK (
        huzur_id IN (SELECT id FROM public.huzurs WHERE user_id = auth.uid())
        OR huzur_id IN (SELECT huzur_id FROM public.managers WHERE user_id = auth.uid())
    );

-- 9.7 Notifications:
-- Users can only see and mark their own notifications as read
CREATE POLICY "Users can view own notifications" ON public.notifications
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications" ON public.notifications
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- 10. Public Schedule View for clean conflict checking without exposing organizer IDs
CREATE OR REPLACE VIEW public.public_confirmed_schedules AS
SELECT
    b.id AS booking_id,
    b.huzur_id,
    b.event_date,
    b.division_id,
    b.district_id,
    b.upazila_id,
    b.status
FROM public.bookings b
WHERE b.status = 'confirmed';
