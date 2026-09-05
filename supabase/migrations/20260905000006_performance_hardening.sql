-- ==============================================================================
-- HUZUR BOOKING PLATFORM — PERFORMANCE HARDENING & SAFEGUARDS MIGRATION
-- Migration: 20260905000006_performance_hardening.sql
-- Purpose:
--   1. GIN index on text array specialties for fast containment searches (@>).
--   2. Composite index on huzurs(is_verified, created_at DESC) for listing & search order.
--   3. Foreign key index on availability_posts(huzur_id) for join & in-queries.
--   4. Partial index on active bookings for rapid calendar conflict lookups.
--   5. Postgres statement timeout to prevent runaway queries holding pool connections.
-- ==============================================================================

-- 1. GIN Index for array containment queries on specialties:
-- Used by: searchHuzurs (query.contains('specialties', [specialty]))
CREATE INDEX IF NOT EXISTS idx_huzurs_specialties 
ON public.huzurs USING gin(specialties);

-- 2. Composite Index for verified speaker listings ordered by date:
-- Used by: searchHuzurs (WHERE is_verified = true ORDER BY created_at DESC)
CREATE INDEX IF NOT EXISTS idx_huzurs_verified_created 
ON public.huzurs(is_verified, created_at DESC);

-- 3. Index on availability_posts by huzur_id:
-- Used by: searchHuzurs batch post lookups (WHERE huzur_id IN (...))
CREATE INDEX IF NOT EXISTS idx_availability_posts_huzur_id 
ON public.availability_posts(huzur_id);

-- 4. Highly Optimized Partial Index for active bookings:
-- Covers: fetchConfirmedBookingsForConflictCheck & checkHuzurDateConflict
-- Only includes 'pending' and 'confirmed' status rows, keeping the B-tree tiny and cache-resident.
CREATE INDEX IF NOT EXISTS idx_bookings_huzur_active_dates 
ON public.bookings(huzur_id, event_date) 
WHERE status IN ('pending', 'confirmed');

-- 5. Additional Index for quick lookup by phone number on organizers:
-- Used by: rate-limiting audits, organizer auth session mapping
CREATE INDEX IF NOT EXISTS idx_organizers_phone 
ON public.organizers(phone);

-- 6. Statement Timeout Safeguard:
-- Enforces a 5-second statement timeout across API roles to kill runaway or deadlocked queries
-- before they can starve the Supavisor connection pool.
DO $$
BEGIN
    EXECUTE 'ALTER ROLE authenticator SET statement_timeout = ''5s''';
    EXECUTE 'ALTER ROLE anon SET statement_timeout = ''5s''';
    EXECUTE 'ALTER ROLE authenticated SET statement_timeout = ''5s''';
EXCEPTION
    WHEN insufficient_privilege THEN
        -- When running in limited test environments without superuser role alteration
        RAISE NOTICE 'Skipping ALTER ROLE statement_timeout due to role privileges';
END $$;
