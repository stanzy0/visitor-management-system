-- Migration: Remove appointments module
-- Date: 2026-08-23
-- Description: Drop appointments table and related columns/objects after feature removal

-- Remove appointment references from visits
ALTER TABLE public.visits
  DROP COLUMN IF EXISTS appointment_id;

-- Remove appointment references from visitor_invitations
ALTER TABLE public.visitor_invitations
  DROP COLUMN IF EXISTS appointment_id;

-- Remove appointment reminder preference
ALTER TABLE notification_preferences
  DROP COLUMN IF EXISTS appointment_reminders;

-- Remove appointments from realtime publication if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND tablename = 'appointments'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.appointments;
  END IF;
END $$;

-- Drop appointments table
DROP TABLE IF EXISTS public.appointments CASCADE;

-- Drop appointment_status enum if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    DROP TYPE appointment_status;
  END IF;
END $$;
