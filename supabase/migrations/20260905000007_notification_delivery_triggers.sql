-- ==============================================================================
-- HUZUR BOOKING PLATFORM — SUPABASE POSTGRES SCHEMA MIGRATION
-- Migration: 20260905000007_notification_delivery_triggers.sql
-- Description: Automated PostgreSQL triggers for booking lifecycle notifications
--              (booking request created -> notify Huzur & managers;
--               booking confirmed/rejected -> notify organizer)
-- ==============================================================================

-- 1. Performance index on notifications for fast user dashboard polling
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread_created 
ON public.notifications(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_booking_type
ON public.notifications(related_booking_id, type);

-- 2. Trigger Function: trg_fn_booking_notifications
CREATE OR REPLACE FUNCTION public.trg_fn_booking_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_huzur_user_id UUID;
    v_organizer_user_id UUID;
    v_mgr RECORD;
    v_venue TEXT;
    v_date TEXT;
BEGIN
    v_venue := COALESCE(NEW.venue_address, 'নির্দিষ্ট ভেন্যু');
    v_date := TO_CHAR(NEW.event_date, 'YYYY-MM-DD');

    -- -------------------------------------------------------------------------
    -- CASE 1: NEW BOOKING REQUEST INSERTED -> Notify Huzur and all Managers
    -- -------------------------------------------------------------------------
    IF (TG_OP = 'INSERT') THEN
        -- Find Huzur's user_id
        SELECT user_id INTO v_huzur_user_id
        FROM public.huzurs
        WHERE id = NEW.huzur_id AND user_id IS NOT NULL;

        IF v_huzur_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                user_id,
                type,
                message,
                related_booking_id,
                is_read,
                created_at
            ) VALUES (
                v_huzur_user_id,
                'booking_request',
                'নতুন মাহফিল বুকিং আবেদন এসেছে: ' || v_date || ' তারিখে ' || v_venue,
                NEW.id,
                false,
                timezone('utc'::text, now())
            );
        END IF;

        -- Notify all authorized managers for this Huzur
        FOR v_mgr IN 
            SELECT user_id FROM public.managers 
            WHERE huzur_id = NEW.huzur_id AND user_id IS NOT NULL
        LOOP
            INSERT INTO public.notifications (
                user_id,
                type,
                message,
                related_booking_id,
                is_read,
                created_at
            ) VALUES (
                v_mgr.user_id,
                'booking_request',
                'নতুন মাহফিল বুকিং আবেদন এসেছে: ' || v_date || ' তারিখে ' || v_venue,
                NEW.id,
                false,
                timezone('utc'::text, now())
            );
        END LOOP;

        RETURN NEW;
    END IF;

    -- -------------------------------------------------------------------------
    -- CASE 2: BOOKING STATUS UPDATED -> Notify Organizer on Confirmed or Rejected
    -- -------------------------------------------------------------------------
    IF (TG_OP = 'UPDATE') THEN
        IF (NEW.status IS DISTINCT FROM OLD.status) AND (NEW.status IN ('confirmed', 'rejected')) THEN
            -- Lookup organizer's user_id
            SELECT user_id INTO v_organizer_user_id
            FROM public.organizers
            WHERE id = NEW.organizer_id AND user_id IS NOT NULL;

            IF v_organizer_user_id IS NOT NULL THEN
                IF NEW.status = 'confirmed' THEN
                    INSERT INTO public.notifications (
                        user_id,
                        type,
                        message,
                        related_booking_id,
                        is_read,
                        created_at
                    ) VALUES (
                        v_organizer_user_id,
                        'booking_confirmed',
                        'আলহামদুলিল্লাহ! আপনার মাহফিল বুকিং আবেদনটি নিশ্চিত করা হয়েছে (' || v_date || ' - ' || v_venue || ')',
                        NEW.id,
                        false,
                        timezone('utc'::text, now())
                    );
                ELSIF NEW.status = 'rejected' THEN
                    INSERT INTO public.notifications (
                        user_id,
                        type,
                        message,
                        related_booking_id,
                        is_read,
                        created_at
                    ) VALUES (
                        v_organizer_user_id,
                        'booking_rejected',
                        'দুঃখিত, আপনার মাহফিল বুকিং আবেদনটি বক্তা বা সমন্বয়কারী কর্তৃক বাতিল করা হয়েছে (' || v_date || ')',
                        NEW.id,
                        false,
                        timezone('utc'::text, now())
                    );
                END IF;
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

-- 3. Bind triggers to public.bookings table
DROP TRIGGER IF EXISTS trg_booking_inserted ON public.bookings;
CREATE TRIGGER trg_booking_inserted
    AFTER INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_booking_notifications();

DROP TRIGGER IF EXISTS trg_booking_status_changed ON public.bookings;
CREATE TRIGGER trg_booking_status_changed
    AFTER UPDATE OF status ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fn_booking_notifications();
