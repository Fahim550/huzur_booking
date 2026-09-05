-- ==============================================================================
-- HUZUR BOOKING PLATFORM — SUPABASE POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000003_i18n_reference_data.sql
-- Description: Add bilingual name_en and name_bn columns to administrative
--              hierarchy (divisions, districts, upazilas) and create
--              public.specialties reference table with RLS.
-- ==============================================================================

-- 1. Ensure divisions has both name_en and name_bn
ALTER TABLE public.divisions
    ADD COLUMN IF NOT EXISTS name_en TEXT,
    ADD COLUMN IF NOT EXISTS name_bn TEXT;

-- Backfill from existing columns if empty
UPDATE public.divisions SET
    name_en = COALESCE(name_en, name),
    name_bn = COALESCE(name_bn, bn_name);

ALTER TABLE public.divisions
    ALTER COLUMN name_en SET NOT NULL,
    ALTER COLUMN name_bn SET NOT NULL;

-- 2. Ensure districts has both name_en and name_bn
ALTER TABLE public.districts
    ADD COLUMN IF NOT EXISTS name_en TEXT,
    ADD COLUMN IF NOT EXISTS name_bn TEXT;

UPDATE public.districts SET
    name_en = COALESCE(name_en, name),
    name_bn = COALESCE(name_bn, bn_name);

ALTER TABLE public.districts
    ALTER COLUMN name_en SET NOT NULL,
    ALTER COLUMN name_bn SET NOT NULL;

-- 3. Ensure upazilas has both name_en and name_bn
ALTER TABLE public.upazilas
    ADD COLUMN IF NOT EXISTS name_en TEXT,
    ADD COLUMN IF NOT EXISTS name_bn TEXT;

UPDATE public.upazilas SET
    name_en = COALESCE(name_en, name),
    name_bn = COALESCE(name_bn, bn_name);

ALTER TABLE public.upazilas
    ALTER COLUMN name_en SET NOT NULL,
    ALTER COLUMN name_bn SET NOT NULL;

-- 4. Create public.specialties reference table for filter chips
CREATE TABLE IF NOT EXISTS public.specialties (
    id SERIAL PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    description_en TEXT,
    description_bn TEXT,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index for ordering filter chips
CREATE INDEX IF NOT EXISTS idx_specialties_order ON public.specialties(display_order);

-- 5. Row Level Security for specialties
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    CREATE POLICY "Public read for specialties" ON public.specialties
        FOR SELECT TO public USING (true);
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
