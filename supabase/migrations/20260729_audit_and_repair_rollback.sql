-- ==================================================
-- ROLLBACK: Revert AFCSC Database Audit and Repair
-- Date: 2026-07-29
-- WARNING: This will remove FK columns and restore
--          previous state. Employee data is preserved
--          but FK references are dropped.
-- ==================================================

-- Drop foreign key constraints
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS fk_employees_department;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS fk_employees_position;
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS fk_employees_office_location;

-- Remove FK columns
ALTER TABLE public.employees DROP COLUMN IF EXISTS department_id;
ALTER TABLE public.employees DROP COLUMN IF EXISTS position_id;
ALTER TABLE public.employees DROP COLUMN IF EXISTS office_location_id;

-- Restore positions.department column if needed
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS department TEXT;

-- Recreate department index on positions
CREATE INDEX IF NOT EXISTS idx_positions_department ON public.positions(department);

-- Drop indexes added by migration
DROP INDEX IF EXISTS public.idx_employees_department_id;
DROP INDEX IF EXISTS public.idx_employees_position_id;
DROP INDEX IF EXISTS public.idx_employees_office_location_id;
DROP INDEX IF EXISTS public.idx_employees_full_name;
DROP INDEX IF EXISTS public.idx_employees_email;
DROP INDEX IF EXISTS public.idx_office_locations_office_name;
DROP INDEX IF EXISTS public.idx_office_locations_display_name;

-- Note: office_locations data is NOT restored from rollback.
--       If you need to restore previous office_locations data,
--       restore from a database backup before running this migration.
