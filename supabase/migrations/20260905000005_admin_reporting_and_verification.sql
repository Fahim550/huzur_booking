-- ==============================================================================
-- HUZUR BOOKING PLATFORM — POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000005_admin_reporting_and_verification.sql
-- Description: Admin reporting aggregate queries (monthly bookings count,
--              most active districts) and huzur verification helper functions.
-- ==============================================================================

-- 1. Function to calculate total bookings created in the current month
CREATE OR REPLACE FUNCTION public.get_admin_monthly_bookings_count()
RETURNS BIGINT
LANGUAGE sql
STABLE
AS $$
    SELECT count(*)::BIGINT
    FROM public.bookings
    WHERE created_at >= date_trunc('month', CURRENT_DATE);
$$;

-- 2. Function to fetch the most active districts by booking count
CREATE OR REPLACE FUNCTION public.get_admin_active_districts(p_limit INT DEFAULT 5)
RETURNS TABLE (
    district_id INT,
    district_name TEXT,
    district_bn_name TEXT,
    booking_count BIGINT
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        d.id AS district_id,
        d.name AS district_name,
        d.bn_name AS district_bn_name,
        count(b.id)::BIGINT AS booking_count
    FROM public.districts d
    JOIN public.bookings b ON b.district_id = d.id
    GROUP BY d.id, d.name, d.bn_name
    ORDER BY booking_count DESC, d.name ASC
    LIMIT p_limit;
$$;

-- 3. Policy for Admin full access to bookings and huzurs
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'huzurs' AND policyname = 'Admins can view and update all huzurs'
    ) THEN
        CREATE POLICY "Admins can view and update all huzurs" ON public.huzurs
            FOR ALL TO authenticated
            USING (
                (auth.jwt() ->> 'role') = 'admin'
                OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            )
            WITH CHECK (
                (auth.jwt() ->> 'role') = 'admin'
                OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
            );
    END IF;
END $$;
