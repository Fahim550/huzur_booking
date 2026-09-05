-- ==============================================================================
-- HUZUR BOOKING PLATFORM — SUPABASE POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000001_init_schema.sql
-- Description: Core schema, btree_gist extension, and booking conflict EXCLUDE constraint
-- ==============================================================================

-- 1. Enable btree_gist extension (MANDATORY for EXCLUDE constraints on scalar types like UUID and DATE)
CREATE EXTENSION IF NOT EXISTS btree_gist;

-- 2. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('huzur', 'organizer', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'rejected', 'cancelled', 'completed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE session_slot AS ENUM (
        'after_asr',       -- বাদ আসর
        'after_maghrib',   -- বাদ মাগরিব
        'after_esha',      -- বাদ এশা (প্রধান বক্তা / Chief Speaker)
        'all_night',       -- শেষ রাত / সারা রাত
        'daytime_special'  -- সকাল / জুমআ / বিশেষ অধিবেশন
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. Profiles table (synced with auth.users or standalone for demo/production)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    role user_role NOT NULL DEFAULT 'organizer',
    full_name TEXT NOT NULL,
    division TEXT NOT NULL,          -- যেমন: ঢাকা, চট্টগ্রাম, সিলেট, রাজশাহী
    district TEXT NOT NULL,          -- যেমন: কুমিল্লা, ব্রাহ্মণবাড়িয়া, বগুড়া, সিলেট
    upazila_or_area TEXT,            -- থানা / এলাকা
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Huzur Profiles table (Extended profile details for Islamic speakers)
CREATE TABLE IF NOT EXISTS public.huzur_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'মাওলানা', -- মাওলানা, মুফতি, শায়খ, আল্লামা, হাফেজ
    designation TEXT,                      -- যেমন: খতিব, শাইখুল হাদিস, মুহাদ্দিস
    madrasa_or_institution TEXT,          -- যেমন: জামিয়া ইসলামিয়া দারুল উলুম
    verified BOOLEAN NOT NULL DEFAULT false,
    topics TEXT[] NOT NULL DEFAULT '{}',   -- আলোচনার বিষয়সমূহ (সিরাতুন্নবী, তাফসীর, ইত্যাদি)
    base_hadya_range TEXT,                 -- সম্মাননা / হাদিয়া রেঞ্জ (যেমন: ২০,০০০ - ৩৫,০০০ ৳)
    minimum_hadya NUMERIC(10, 2),
    is_available BOOLEAN NOT NULL DEFAULT true,
    short_bio_bn TEXT,
    featured_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Bookings table with PostgreSQL EXCLUDE constraint
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    huzur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    event_date DATE NOT NULL,
    session_slot session_slot NOT NULL DEFAULT 'after_esha',
    mahfil_name TEXT NOT NULL,               -- মাহফিলের নাম (যেমন: বার্ষিক ইসলামী মহা সম্মেলন)
    district TEXT NOT NULL,                  -- মাহফিলের জেলা
    venue_address TEXT NOT NULL,             -- বিস্তারিত স্থান ও ঠিকানা
    contact_person_name TEXT NOT NULL,      -- যোগাযোগকারীর নাম
    contact_phone TEXT NOT NULL,             -- জরুরি যোগাযোগের নম্বর (বাংলাদেশী ফোন)
    status booking_status NOT NULL DEFAULT 'pending',
    hadya_offered NUMERIC(10, 2),           -- প্রস্তাবিত হাদিয়া (টাকা)
    notes TEXT,                              -- বিশেষ নির্দেশনা / আবেদন
    rejection_reason TEXT,                   -- বাতিলের কারণ (প্রযোজ্য হলে)
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ==============================================================================
-- NON-NEGOTIABLE RULE 4: CONCURRENCY CONFLICT PREVENTION
-- Prevent race-condition double bookings using Postgres btree_gist EXCLUDE constraint.
-- Any concurrent or subsequent booking for the same huzur on the same event_date
-- with status IN ('pending', 'confirmed') will be rejected by Postgres at the database engine level.
-- ==============================================================================
DO $$ BEGIN
    ALTER TABLE public.bookings
    ADD CONSTRAINT prevent_huzur_double_booking
    EXCLUDE USING gist (
        huzur_id WITH =,
        event_date WITH =
    ) WHERE (status IN ('pending', 'confirmed'));
EXCEPTION
    WHEN duplicate_table THEN null;
    WHEN duplicate_object THEN null;
END $$;

-- 6. Availability Blocks (Dates when Huzur marks themselves manually unavailable)
CREATE TABLE IF NOT EXISTS public.availability_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    huzur_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_date DATE NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_huzur_blocked_date UNIQUE (huzur_id, blocked_date)
);

-- 7. Notifications table (In-app notifications in Bengali)
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    message_bn TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_bookings_huzur_date ON public.bookings(huzur_id, event_date);
CREATE INDEX IF NOT EXISTS idx_bookings_organizer ON public.bookings(organizer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_huzur_profiles_verified ON public.huzur_profiles(verified);
CREATE INDEX IF NOT EXISTS idx_huzur_profiles_available ON public.huzur_profiles(is_available);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_district ON public.profiles(district);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;

-- 9. Function & Trigger to update timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_huzur_profiles_updated_at ON public.huzur_profiles;
CREATE TRIGGER trg_huzur_profiles_updated_at
    BEFORE UPDATE ON public.huzur_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_bookings_updated_at ON public.bookings;
CREATE TRIGGER trg_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
