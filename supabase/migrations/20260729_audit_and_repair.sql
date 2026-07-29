-- ==================================================
-- MIGRATION: AFCSC Database Audit and Repair
-- Date: 2026-07-29
-- Purpose: Fix schema issues, rebuild lookup tables,
--          normalize employee references, and ensure
--          data integrity without breaking the app.
-- ==================================================

-- ==================================================
-- 0. AUDIT: Inspect current schema state
-- ==================================================

-- Current employees columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'employees'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Current positions columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'positions'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Current office_locations columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'office_locations'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check for orphan employees
SELECT COUNT(*) AS orphan_employees
FROM public.employees e
LEFT JOIN public.departments d ON e.department = d.name
WHERE e.department IS NOT NULL AND d.name IS NULL;

-- Check for duplicate positions
SELECT title, COUNT(*) AS cnt
FROM public.positions
GROUP BY title
HAVING COUNT(*) > 1;

-- Check for duplicate office locations
SELECT name, COUNT(*) AS cnt
FROM public.office_locations
GROUP BY name
HAVING COUNT(*) > 1;

-- ==================================================
-- 1. DEPARTMENTS: Ensure table exists and is seeded
-- ==================================================

CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can create departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can update departments" ON public.departments;
DROP POLICY IF EXISTS "Authenticated users can delete departments" ON public.departments;

CREATE POLICY "Authenticated users can view departments"
  ON public.departments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create departments"
  ON public.departments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update departments"
  ON public.departments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete departments"
  ON public.departments FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_departments_name ON public.departments(name);

INSERT INTO public.departments (name) VALUES
  ('Department of Land Warfare'),
  ('Department of Maritime Warfare'),
  ('Department of Air Warfare'),
  ('Department of Joint Studies'),
  ('ICT Department'),
  ('Headquarters'),
  ('Finance'),
  ('Registry'),
  ('Administration'),
  ('Library'),
  ('Medical Services'),
  ('Logistics'),
  ('Security'),
  ('Engineering'),
  ('Signals')
ON CONFLICT (name) DO NOTHING;

-- ==================================================
-- 2. POSITIONS: Make completely independent
-- ==================================================

-- Remove department column if it exists
ALTER TABLE public.positions DROP COLUMN IF EXISTS department;
DROP INDEX IF EXISTS public.idx_positions_department;

-- Ensure title is unique
ALTER TABLE public.positions DROP CONSTRAINT IF EXISTS positions_title_key;
ALTER TABLE public.positions ADD CONSTRAINT positions_title_key UNIQUE (title);

-- Seed comprehensive AFCSC positions (independent of departments)
INSERT INTO public.positions (title) VALUES
  ('Commandant'),
  ('Deputy Commandant'),
  ('Chief of Staff'),
  ('Director'),
  ('Head of Department'),
  ('Director of Studies'),
  ('Chief Instructor'),
  ('Directing Staff'),
  ('Senior Instructor'),
  ('Instructor'),
  ('Research Fellow'),
  ('Student'),
  ('International Student'),
  ('ICT Staff'),
  ('Network Administrator'),
  ('Systems Administrator'),
  ('Database Administrator'),
  ('Help Desk Officer'),
  ('Administrative Officer'),
  ('Executive Assistant'),
  ('Secretary'),
  ('Registry Officer'),
  ('Reception Officer'),
  ('Clerk'),
  ('Human Resources Officer'),
  ('Protocol Officer'),
  ('Public Relations Officer'),
  ('Accountant'),
  ('Budget Officer'),
  ('Payroll Officer'),
  ('Internal Auditor'),
  ('Logistics Officer'),
  ('Supply Officer'),
  ('Store Officer'),
  ('Procurement Officer'),
  ('Transport Officer'),
  ('Medical Officer'),
  ('Nurse'),
  ('Pharmacist'),
  ('Laboratory Technician'),
  ('Librarian'),
  ('Assistant Librarian'),
  ('Chief Security Officer'),
  ('Security Officer'),
  ('Gate Supervisor'),
  ('Fire Officer'),
  ('Works Officer'),
  ('Maintenance Officer'),
  ('Electrical Technician'),
  ('Mechanical Technician'),
  ('Signals Officer'),
  ('Communications Officer'),
  ('Driver'),
  ('Cleaner'),
  ('Messenger'),
  ('Office Assistant')
ON CONFLICT (title) DO NOTHING;

-- ==================================================
-- 3. OFFICE LOCATIONS: Rebuild with correct departments
-- ==================================================

-- Drop old unique constraint on name
ALTER TABLE public.office_locations DROP CONSTRAINT IF EXISTS office_locations_name_key;
ALTER TABLE public.office_locations DROP CONSTRAINT IF EXISTS office_locations_name_dept_building_key;

-- Add composite unique constraint
ALTER TABLE public.office_locations
  ADD CONSTRAINT office_locations_name_dept_building_key UNIQUE (name, department, building);

-- Ensure required columns exist
ALTER TABLE public.office_locations
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Delete all existing data to rebuild cleanly
DELETE FROM public.office_locations;

-- Reinsert with correct AFCSC department assignments
INSERT INTO public.office_locations (name, building, department, office_name, display_name) VALUES
  -- Department of Land Warfare
  ('Head of Department Office', 'Academic Block A', 'Department of Land Warfare', 'Head of Department Office', 'Academic Block A — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block A', 'Department of Land Warfare', 'Director of Studies Office', 'Academic Block A — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Chief Instructor Office', 'Academic Block A — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Senior Instructor Office', 'Academic Block A — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Instructor Office', 'Academic Block A — Instructor Office'),
  ('Staff Office', 'Academic Block A', 'Department of Land Warfare', 'Staff Office', 'Academic Block A — Staff Office'),
  ('Seminar Room', 'Academic Block A', 'Department of Land Warfare', 'Seminar Room', 'Academic Block A — Seminar Room'),
  ('FYA Auditorium', 'Academic Block', 'Department of Land Warfare', 'FYA Auditorium', 'Academic Block — FYA Auditorium'),
  ('Boam Hall', 'Academic Block', 'Department of Land Warfare', 'Boam Hall', 'Academic Block — Boam Hall'),
  ('Abacha Hall', 'Academic Block', 'Department of Land Warfare', 'Abacha Hall', 'Academic Block — Abacha Hall'),
  ('Alpha Div', 'Academic Block', 'Department of Land Warfare', 'Alpha Div', 'Academic Block — Alpha Div'),
  ('Bravo Div', 'Academic Block', 'Department of Land Warfare', 'Bravo Div', 'Academic Block — Bravo Div'),
  ('Charlie Div', 'Academic Block', 'Department of Land Warfare', 'Charlie Div', 'Academic Block — Charlie Div'),
  ('Delta Div', 'Academic Block', 'Department of Land Warfare', 'Delta Div', 'Academic Block — Delta Div'),
  ('Echo Div', 'Academic Block', 'Department of Land Warfare', 'Echo Div', 'Academic Block — Echo Div'),

  -- Department of Maritime Warfare
  ('Head of Department Office', 'Academic Block B', 'Department of Maritime Warfare', 'Head of Department Office', 'Academic Block B — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block B', 'Department of Maritime Warfare', 'Director of Studies Office', 'Academic Block B — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Chief Instructor Office', 'Academic Block B — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Senior Instructor Office', 'Academic Block B — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Instructor Office', 'Academic Block B — Instructor Office'),
  ('Staff Office', 'Academic Block B', 'Department of Maritime Warfare', 'Staff Office', 'Academic Block B — Staff Office'),

  -- Department of Air Warfare
  ('Head of Department Office', 'Academic Block C', 'Department of Air Warfare', 'Head of Department Office', 'Academic Block C — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block C', 'Department of Air Warfare', 'Director of Studies Office', 'Academic Block C — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Chief Instructor Office', 'Academic Block C — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Senior Instructor Office', 'Academic Block C — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Instructor Office', 'Academic Block C — Instructor Office'),
  ('Staff Office', 'Academic Block C', 'Department of Air Warfare', 'Staff Office', 'Academic Block C — Staff Office'),

  -- Department of Joint Studies
  ('Main Auditorium', 'Academic Block', 'Department of Joint Studies', 'Main Auditorium', 'Academic Block — Main Auditorium'),
  ('Syndicate Rooms', 'Academic Block', 'Department of Joint Studies', 'Syndicate Rooms', 'Academic Block — Syndicate Rooms'),
  ('Lecture Hall A', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall A', 'Academic Block — Lecture Hall A'),
  ('Lecture Hall B', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall B', 'Academic Block — Lecture Hall B'),
  ('Lecture Hall C', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall C', 'Academic Block — Lecture Hall C'),
  ('Simulation Centre', 'Academic Block', 'Department of Joint Studies', 'Simulation Centre', 'Academic Block — Simulation Centre'),

  -- ICT Department
  ('ICT Building Room 101', 'ICT Building', 'ICT Department', 'ICT Building Room 101', 'ICT Building — Room 101'),
  ('ICT Building Room 102', 'ICT Building', 'ICT Department', 'ICT Building Room 102', 'ICT Building — Room 102'),
  ('ICT Building Room 201', 'ICT Building', 'ICT Department', 'ICT Building Room 201', 'ICT Building — Room 201'),
  ('ICT Building Room 204', 'ICT Building', 'ICT Department', 'ICT Building Room 204', 'ICT Building — Room 204'),
  ('Server Room', 'ICT Building', 'ICT Department', 'Server Room', 'ICT Building — Server Room'),
  ('Network Operations Centre', 'ICT Building', 'ICT Department', 'Network Operations Centre', 'ICT Building — Network Operations Centre'),
  ('Computer Laboratory', 'ICT Building', 'ICT Department', 'Computer Laboratory', 'ICT Building — Computer Laboratory'),

  -- Headquarters
  ('Commandant''s Office', 'Headquarters Block', 'Headquarters', 'Commandant''s Office', 'Headquarters Block — Commandant''s Office'),
  ('Deputy Commandant''s Office', 'Headquarters Block', 'Headquarters', 'Deputy Commandant''s Office', 'Headquarters Block — Deputy Commandant''s Office'),
  ('Chief of Staff Office', 'Headquarters Block', 'Headquarters', 'Chief of Staff Office', 'Headquarters Block — Chief of Staff Office'),
  ('Headquarters Secretariat', 'Headquarters Block', 'Headquarters', 'Headquarters Secretariat', 'Headquarters Block — Headquarters Secretariat'),
  ('Headquarters Conference Room', 'Headquarters Block', 'Headquarters', 'Headquarters Conference Room', 'Headquarters Block — Headquarters Conference Room'),
  ('Protocol Office', 'Headquarters Block', 'Headquarters', 'Protocol Office', 'Headquarters Block — Protocol Office'),
  ('Public Relations Office', 'Headquarters Block', 'Headquarters', 'Public Relations Office', 'Headquarters Block — Public Relations Office'),

  -- Finance
  ('Accounts Office', 'Administration Block', 'Finance', 'Accounts Office', 'Administration Block — Accounts Office'),
  ('Budget Office', 'Administration Block', 'Finance', 'Budget Office', 'Administration Block — Budget Office'),
  ('Payroll Office', 'Administration Block', 'Finance', 'Payroll Office', 'Administration Block — Payroll Office'),
  ('Internal Audit Office', 'Administration Block', 'Finance', 'Internal Audit Office', 'Administration Block — Internal Audit Office'),

  -- Registry
  ('Registry Main Office', 'Administration Block', 'Registry', 'Registry Main Office', 'Administration Block — Registry Main Office'),
  ('Records Office', 'Administration Block', 'Registry', 'Records Office', 'Administration Block — Records Office'),
  ('Admissions Office', 'Administration Block', 'Registry', 'Admissions Office', 'Administration Block — Admissions Office'),
  ('Certificates Office', 'Administration Block', 'Registry', 'Certificates Office', 'Administration Block — Certificates Office'),

  -- Administration
  ('Administrative Office', 'Administration Block', 'Administration', 'Administrative Office', 'Administration Block — Administrative Office'),
  ('Human Resources Office', 'Administration Block', 'Administration', 'Human Resources Office', 'Administration Block — Human Resources Office'),
  ('General Administration Office', 'Administration Block', 'Administration', 'General Administration Office', 'Administration Block — General Administration Office'),
  ('Reception', 'Administration Block', 'Administration', 'Reception', 'Administration Block — Reception'),
  ('Visitors Centre', 'Administration Block', 'Administration', 'Visitors Centre', 'Administration Block — Visitors Centre'),
  ('Senior Officers'' Mess', 'Administration Block', 'Administration', 'Senior Officers'' Mess', 'Administration Block — Senior Officers'' Mess'),
  ('Students'' Mess', 'Administration Block', 'Administration', 'Students'' Mess', 'Administration Block — Students'' Mess'),
  ('Officers Lounge', 'Administration Block', 'Administration', 'Officers Lounge', 'Administration Block — Officers Lounge'),
  ('Sports Complex Office', 'Administration Block', 'Administration', 'Sports Complex Office', 'Administration Block — Sports Complex Office'),
  ('Gymnasium Office', 'Administration Block', 'Administration', 'Gymnasium Office', 'Administration Block — Gymnasium Office'),
  ('Welfare Office', 'Administration Block', 'Administration', 'Welfare Office', 'Administration Block — Welfare Office'),
  ('Chaplain''s Office', 'Administration Block', 'Administration', 'Chaplain''s Office', 'Administration Block — Chaplain''s Office'),
  ('Central Mosque Office', 'Administration Block', 'Administration', 'Central Mosque Office', 'Administration Block — Central Mosque Office'),

  -- Library
  ('Librarian Office', 'Library Block', 'Library', 'Librarian Office', 'Library Block — Librarian Office'),
  ('Digital Library', 'Library Block', 'Library', 'Digital Library', 'Library Block — Digital Library'),
  ('Archive Section', 'Library Block', 'Library', 'Archive Section', 'Library Block — Archive Section'),
  ('Circulation Desk', 'Library Block', 'Library', 'Circulation Desk', 'Library Block — Circulation Desk'),

  -- Medical Services
  ('Clinic Reception', 'Medical Block', 'Medical Services', 'Clinic Reception', 'Medical Block — Clinic Reception'),
  ('Medical Officer Office', 'Medical Block', 'Medical Services', 'Medical Officer Office', 'Medical Block — Medical Officer Office'),
  ('Pharmacy', 'Medical Block', 'Medical Services', 'Pharmacy', 'Medical Block — Pharmacy'),
  ('Treatment Room', 'Medical Block', 'Medical Services', 'Treatment Room', 'Medical Block — Treatment Room'),

  -- Logistics
  ('Logistics Office', 'Administration Block', 'Logistics', 'Logistics Office', 'Administration Block — Logistics Office'),
  ('Supply Office', 'Administration Block', 'Logistics', 'Supply Office', 'Administration Block — Supply Office'),
  ('Stores Office', 'Administration Block', 'Logistics', 'Stores Office', 'Administration Block — Stores Office'),
  ('Equipment Office', 'Administration Block', 'Logistics', 'Equipment Office', 'Administration Block — Equipment Office'),
  ('Transport Office', 'Transport Yard', 'Logistics', 'Transport Office', 'Transport Yard — Transport Office'),
  ('Vehicle Yard', 'Transport Yard', 'Logistics', 'Vehicle Yard', 'Transport Yard — Vehicle Yard'),

  -- Security
  ('Quarter Guard', 'Gate House', 'Security', 'Quarter Guard', 'Gate House — Quarter Guard'),
  ('Main Gate Security Office', 'Gate House', 'Security', 'Main Gate Security Office', 'Gate House — Main Gate Security Office'),
  ('Security Control Room', 'Headquarters Block', 'Security', 'Security Control Room', 'Headquarters Block — Security Control Room'),
  ('CCTV Monitoring Room', 'Headquarters Block', 'Security', 'CCTV Monitoring Room', 'Headquarters Block — CCTV Monitoring Room'),
  ('Parking Control Office', 'Gate House', 'Security', 'Parking Control Office', 'Gate House — Parking Control Office'),
  ('Fire Station', 'Security Complex', 'Security', 'Fire Station', 'Security Complex — Fire Station'),

  -- Engineering
  ('Works Department', 'Workshop Complex', 'Engineering', 'Works Department', 'Workshop Complex — Works Department'),
  ('Maintenance Workshop', 'Workshop Complex', 'Engineering', 'Maintenance Workshop', 'Workshop Complex — Maintenance Workshop'),
  ('Generator House', 'Workshop Complex', 'Engineering', 'Generator House', 'Workshop Complex — Generator House'),

  -- Signals
  ('Signals Centre', 'Communications Building', 'Signals', 'Signals Centre', 'Communications Building — Signals Centre'),
  ('Communications Room', 'Communications Building', 'Signals', 'Communications Room', 'Communications Building — Communications Room');

-- ==================================================
-- 4. EMPLOYEES: Add foreign key references
-- ==================================================

-- Add FK columns if they don't exist
ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS department_id UUID,
  ADD COLUMN IF NOT EXISTS position_id UUID,
  ADD COLUMN IF NOT EXISTS office_location_id UUID;

-- Migrate existing text values to FK columns
UPDATE public.employees e
SET department_id = d.id
FROM public.departments d
WHERE e.department = d.name;

UPDATE public.employees e
SET position_id = p.id
FROM public.positions p
WHERE e.position = p.title;

UPDATE public.employees e
SET office_location_id = ol.id
FROM public.office_locations ol
WHERE e.office_location = ol.name;

-- Add foreign key constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass
      AND conname = 'fk_employees_department'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_department
      FOREIGN KEY (department_id) REFERENCES public.departments(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass
      AND conname = 'fk_employees_position'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_position
      FOREIGN KEY (position_id) REFERENCES public.positions(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass
      AND conname = 'fk_employees_office_location'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT fk_employees_office_location
      FOREIGN KEY (office_location_id) REFERENCES public.office_locations(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ==================================================
-- 5. INDEXES
-- ==================================================

CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_office_location_id ON public.employees(office_location_id);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON public.employees(full_name);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_office_locations_department ON public.office_locations(department);
CREATE INDEX IF NOT EXISTS idx_office_locations_office_name ON public.office_locations(office_name);
CREATE INDEX IF NOT EXISTS idx_office_locations_display_name ON public.office_locations(display_name);

-- ==================================================
-- 6. VERIFICATION QUERIES
-- ==================================================

-- Department counts
SELECT 'departments' AS table_name, COUNT(*) AS count FROM public.departments
UNION ALL
SELECT 'positions', COUNT(*) FROM public.positions
UNION ALL
SELECT 'office_locations', COUNT(*) FROM public.office_locations
UNION ALL
SELECT 'employees', COUNT(*) FROM public.employees;

-- Office counts by department
SELECT department, COUNT(*) AS count
FROM public.office_locations
GROUP BY department
ORDER BY department;

-- Duplicate office locations
SELECT name, COUNT(*) AS cnt
FROM public.office_locations
GROUP BY name
HAVING COUNT(*) > 1;

-- Duplicate positions
SELECT title, COUNT(*) AS cnt
FROM public.positions
GROUP BY title
HAVING COUNT(*) > 1;

-- Orphan employees (missing department)
SELECT COUNT(*) AS orphan_employees
FROM public.employees e
LEFT JOIN public.departments d ON e.department_id = d.id
WHERE e.department_id IS NOT NULL AND d.id IS NULL;

-- Orphan employees (missing position)
SELECT COUNT(*) AS orphan_employees
FROM public.employees e
LEFT JOIN public.positions p ON e.position_id = p.id
WHERE e.position_id IS NOT NULL AND p.id IS NULL;

-- Orphan employees (missing office location)
SELECT COUNT(*) AS orphan_employees
FROM public.employees e
LEFT JOIN public.office_locations ol ON e.office_location_id = ol.id
WHERE e.office_location_id IS NOT NULL AND ol.id IS NULL;

-- Employees referencing missing office locations (by text)
SELECT COUNT(*) AS invalid_office_refs
FROM public.employees e
LEFT JOIN public.office_locations ol ON e.office_location = ol.name
WHERE e.office_location IS NOT NULL AND ol.name IS NULL;

-- Employees referencing missing positions (by text)
SELECT COUNT(*) AS invalid_position_refs
FROM public.employees e
LEFT JOIN public.positions p ON e.position = p.title
WHERE e.position IS NOT NULL AND p.title IS NULL;

-- Verify positions has no department column
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'positions'
  AND column_name = 'department';

-- Verify key office locations
SELECT name, department, building, display_name
FROM public.office_locations
WHERE name IN (
  'FYA Auditorium',
  'Commandant''s Office',
  'ICT Building Room 101',
  'Quarter Guard',
  'Accounts Office',
  'Librarian Office',
  'Medical Officer Office',
  'Head of Department Office'
)
ORDER BY department, name;
