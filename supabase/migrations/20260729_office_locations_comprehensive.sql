-- Migration: Normalize office_locations with office_name and display_name
-- Date: 2026-07-29
-- Description: Add office_name and display_name fields for AFCSC office locations

-- =============================================================================
-- Fix uniqueness constraint to allow same office name in different departments
-- =============================================================================

ALTER TABLE office_locations DROP CONSTRAINT IF EXISTS office_locations_name_key;

ALTER TABLE office_locations ADD CONSTRAINT office_locations_name_dept_building_key UNIQUE (name, department, building);

-- =============================================================================
-- Add columns
-- =============================================================================

ALTER TABLE office_locations
  ADD COLUMN IF NOT EXISTS office_name TEXT,
  ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Backfill display_name from existing data
UPDATE office_locations
SET
  office_name = name,
  display_name = COALESCE(building || ' — ' || name, name)
WHERE display_name IS NULL;

-- =============================================================================
-- Update existing department values to match departments table
-- =============================================================================

UPDATE office_locations
SET department = 'Headquarters'
WHERE department = 'Commandant';

UPDATE office_locations
SET department = 'Department of Land Warfare'
WHERE department = 'Academic'
  AND name IN ('Department of Land Warfare', 'Department of Maritime Warfare', 'Department of Air Warfare', 'Department of Joint Studies');

UPDATE office_locations
SET department = 'Department of Joint Studies'
WHERE name IN ('FYA Block', 'FYA Auditorium', 'Danjuma Hall', 'Main Auditorium', 'Syndicate Rooms', 'Lecture Hall A', 'Lecture Hall B', 'Lecture Hall C', 'Simulation Centre');

UPDATE office_locations
SET department = 'Engineering'
WHERE name IN ('Works Department', 'Maintenance Workshop', 'Generator House');

UPDATE office_locations
SET department = 'Signal'
WHERE name IN ('Signals Centre', 'Communications Room');

-- =============================================================================
-- Seed comprehensive AFCSC office locations
-- =============================================================================

-- Headquarters
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Commandants Office', 'Headquarters Block', 'Headquarters', 'Commandant''s Office', 'Headquarters Block — Commandant''s Office'),
  ('Deputy Commandants Office', 'Headquarters Block', 'Headquarters', 'Deputy Commandant''s Office', 'Headquarters Block — Deputy Commandant''s Office'),
  ('Chief of Staff Office', 'Headquarters Block', 'Headquarters', 'Chief of Staff Office', 'Headquarters Block — Chief of Staff Office'),
  ('Headquarters Conference Room', 'Headquarters Block', 'Headquarters', 'Headquarters Conference Room', 'Headquarters Block — Headquarters Conference Room'),
  ('Headquarters Secretariat', 'Headquarters Block', 'Headquarters', 'Headquarters Secretariat', 'Headquarters Block — Headquarters Secretariat'),
  ('Protocol Office', 'Headquarters Block', 'Headquarters', 'Protocol Office', 'Headquarters Block — Protocol Office'),
  ('Public Relations Office', 'Headquarters Block', 'Headquarters', 'Public Relations Office', 'Headquarters Block — Public Relations Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Department of Land Warfare
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Head of Department Office', 'Academic Block A', 'Department of Land Warfare', 'Head of Department Office', 'Academic Block A — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block A', 'Department of Land Warfare', 'Director of Studies Office', 'Academic Block A — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Chief Instructor Office', 'Academic Block A — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Senior Instructor Office', 'Academic Block A — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Instructor Office', 'Academic Block A — Instructor Office'),
  ('Staff Office', 'Academic Block A', 'Department of Land Warfare', 'Staff Office', 'Academic Block A — Staff Office'),
  ('Seminar Room', 'Academic Block A', 'Department of Land Warfare', 'Seminar Room', 'Academic Block A — Seminar Room')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Department of Maritime Warfare
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Head of Department Office', 'Academic Block B', 'Department of Maritime Warfare', 'Head of Department Office', 'Academic Block B — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block B', 'Department of Maritime Warfare', 'Director of Studies Office', 'Academic Block B — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Chief Instructor Office', 'Academic Block B — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Senior Instructor Office', 'Academic Block B — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block B', 'Department of Maritime Warfare', 'Instructor Office', 'Academic Block B — Instructor Office'),
  ('Staff Office', 'Academic Block B', 'Department of Maritime Warfare', 'Staff Office', 'Academic Block B — Staff Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Department of Air Warfare
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Head of Department Office', 'Academic Block C', 'Department of Air Warfare', 'Head of Department Office', 'Academic Block C — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block C', 'Department of Air Warfare', 'Director of Studies Office', 'Academic Block C — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Chief Instructor Office', 'Academic Block C — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Senior Instructor Office', 'Academic Block C — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block C', 'Department of Air Warfare', 'Instructor Office', 'Academic Block C — Instructor Office'),
  ('Staff Office', 'Academic Block C', 'Department of Air Warfare', 'Staff Office', 'Academic Block C — Staff Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Department of Joint Studies
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Head of Department Office', 'Academic Block D', 'Department of Joint Studies', 'Head of Department Office', 'Academic Block D — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block D', 'Department of Joint Studies', 'Director of Studies Office', 'Academic Block D — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block D', 'Department of Joint Studies', 'Chief Instructor Office', 'Academic Block D — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block D', 'Department of Joint Studies', 'Senior Instructor Office', 'Academic Block D — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block D', 'Department of Joint Studies', 'Instructor Office', 'Academic Block D — Instructor Office'),
  ('Staff Office', 'Academic Block D', 'Department of Joint Studies', 'Staff Office', 'Academic Block D — Staff Office'),
  ('FYA Block', 'Academic Block', 'Department of Joint Studies', 'FYA Block', 'Academic Block — FYA Block'),
  ('FYA Auditorium', 'Academic Block', 'Department of Joint Studies', 'FYA Auditorium', 'Academic Block — FYA Auditorium'),
  ('Danjuma Hall', 'Academic Block', 'Department of Joint Studies', 'Danjuma Hall', 'Academic Block — Danjuma Hall'),
  ('Main Auditorium', 'Academic Block', 'Department of Joint Studies', 'Main Auditorium', 'Academic Block — Main Auditorium'),
  ('Syndicate Rooms', 'Academic Block', 'Department of Joint Studies', 'Syndicate Rooms', 'Academic Block — Syndicate Rooms'),
  ('Lecture Hall A', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall A', 'Academic Block — Lecture Hall A'),
  ('Lecture Hall B', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall B', 'Academic Block — Lecture Hall B'),
  ('Lecture Hall C', 'Academic Block', 'Department of Joint Studies', 'Lecture Hall C', 'Academic Block — Lecture Hall C'),
  ('Simulation Centre', 'Academic Block', 'Department of Joint Studies', 'Simulation Centre', 'Academic Block — Simulation Centre')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- ICT Department
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Room 101', 'ICT Building', 'ICT Department', 'ICT Building Room 101', 'ICT Building — Room 101'),
  ('Room 102', 'ICT Building', 'ICT Department', 'ICT Building Room 102', 'ICT Building — Room 102'),
  ('Room 201', 'ICT Building', 'ICT Department', 'ICT Building Room 201', 'ICT Building — Room 201'),
  ('Room 204', 'ICT Building', 'ICT Department', 'ICT Building Room 204', 'ICT Building — Room 204'),
  ('Server Room', 'ICT Building', 'ICT Department', 'Server Room', 'ICT Building — Server Room'),
  ('Network Operations Centre', 'ICT Building', 'ICT Department', 'Network Operations Centre', 'ICT Building — Network Operations Centre'),
  ('Computer Laboratory', 'ICT Building', 'ICT Department', 'Computer Laboratory', 'ICT Building — Computer Laboratory')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Registry
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Registry Main Office', 'Administration Block', 'Registry', 'Registry Main Office', 'Administration Block — Registry Main Office'),
  ('Records Office', 'Administration Block', 'Registry', 'Records Office', 'Administration Block — Records Office'),
  ('Admissions Office', 'Administration Block', 'Registry', 'Admissions Office', 'Administration Block — Admissions Office'),
  ('Certificates Office', 'Administration Block', 'Registry', 'Certificates Office', 'Administration Block — Certificates Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Administration
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Administrative Office', 'Administration Block', 'Administration', 'Administrative Office', 'Administration Block — Administrative Office'),
  ('Human Resources Office', 'Administration Block', 'Administration', 'Human Resources Office', 'Administration Block — Human Resources Office'),
  ('General Administration Office', 'Administration Block', 'Administration', 'General Administration Office', 'Administration Block — General Administration Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Finance
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Accounts Office', 'Administration Block', 'Finance', 'Accounts Office', 'Administration Block — Accounts Office'),
  ('Payroll Office', 'Administration Block', 'Finance', 'Payroll Office', 'Administration Block — Payroll Office'),
  ('Budget Office', 'Administration Block', 'Finance', 'Budget Office', 'Administration Block — Budget Office'),
  ('Internal Audit Office', 'Administration Block', 'Finance', 'Internal Audit Office', 'Administration Block — Internal Audit Office')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Logistics
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Logistics Office', 'Administration Block', 'Logistics', 'Logistics Office', 'Administration Block — Logistics Office'),
  ('Supply Office', 'Administration Block', 'Logistics', 'Supply Office', 'Administration Block — Supply Office'),
  ('Stores Office', 'Administration Block', 'Logistics', 'Stores Office', 'Administration Block — Stores Office'),
  ('Equipment Office', 'Administration Block', 'Logistics', 'Equipment Office', 'Administration Block — Equipment Office'),
  ('Transport Office', 'Transport Yard', 'Logistics', 'Transport Office', 'Transport Yard — Transport Office'),
  ('Vehicle Yard', 'Transport Yard', 'Logistics', 'Vehicle Yard', 'Transport Yard — Vehicle Yard')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Medical Services
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Clinic Reception', 'Medical Block', 'Medical Services', 'Clinic Reception', 'Medical Block — Clinic Reception'),
  ('Medical Officer Office', 'Medical Block', 'Medical Services', 'Medical Officer Office', 'Medical Block — Medical Officer Office'),
  ('Pharmacy', 'Medical Block', 'Medical Services', 'Pharmacy', 'Medical Block — Pharmacy'),
  ('Treatment Room', 'Medical Block', 'Medical Services', 'Treatment Room', 'Medical Block — Treatment Room')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Library
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Librarian Office', 'Library Block', 'Library', 'Librarian Office', 'Library Block — Librarian Office'),
  ('Digital Library', 'Library Block', 'Library', 'Digital Library', 'Library Block — Digital Library'),
  ('Circulation Desk', 'Library Block', 'Library', 'Circulation Desk', 'Library Block — Circulation Desk'),
  ('Archive Section', 'Library Block', 'Library', 'Archive Section', 'Library Block — Archive Section')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Security
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Quarter Guard', 'Gate House', 'Security', 'Quarter Guard', 'Gate House — Quarter Guard'),
  ('Main Gate Security Office', 'Gate House', 'Security', 'Main Gate Security Office', 'Gate House — Main Gate Security Office'),
  ('Parking Control Office', 'Gate House', 'Security', 'Parking Control Office', 'Gate House — Parking Control Office'),
  ('Security Control Room', 'Headquarters Block', 'Security', 'Security Control Room', 'Headquarters Block — Security Control Room'),
  ('CCTV Monitoring Room', 'Headquarters Block', 'Security', 'CCTV Monitoring Room', 'Headquarters Block — CCTV Monitoring Room'),
  ('Fire Station', 'Security Complex', 'Security', 'Fire Station', 'Security Complex — Fire Station')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Operations
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Operations Centre', 'Operations Building', 'Operations', 'Operations Centre', 'Operations Building — Operations Centre'),
  ('Duty Room', 'Operations Building', 'Operations', 'Duty Room', 'Operations Building — Duty Room'),
  ('Command Operations Room', 'Operations Building', 'Operations', 'Command Operations Room', 'Operations Building — Command Operations Room')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Engineering
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Works Department', 'Workshop Complex', 'Engineering', 'Works Department', 'Workshop Complex — Works Department'),
  ('Maintenance Workshop', 'Workshop Complex', 'Engineering', 'Maintenance Workshop', 'Workshop Complex — Maintenance Workshop'),
  ('Generator House', 'Workshop Complex', 'Engineering', 'Generator House', 'Workshop Complex — Generator House')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- Signals
INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  ('Signals Centre', 'Communications Building', 'Signals', 'Signals Centre', 'Communications Building — Signals Centre'),
  ('Communications Room', 'Communications Building', 'Signals', 'Communications Room', 'Communications Building — Communications Room')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- =============================================================================
-- Update indexes
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_office_locations_department ON office_locations(department);
CREATE INDEX IF NOT EXISTS idx_office_locations_office_name ON office_locations(office_name);
CREATE INDEX IF NOT EXISTS idx_office_locations_display_name ON office_locations(display_name);
