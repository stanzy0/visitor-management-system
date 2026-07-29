-- Migration: Final rebuild of office_locations with correct AFCSC departments
-- Date: 2026-07-29
-- Description: Delete corrupted office_locations and rebuild with correct department assignments.
--              Positions are independent and have no department column.

-- =============================================================================
-- Ensure positions table is independent (no department column)
-- =============================================================================

ALTER TABLE positions DROP COLUMN IF EXISTS department;
DROP INDEX IF EXISTS idx_positions_department;

-- =============================================================================
-- Delete all existing office_locations data
-- =============================================================================

DELETE FROM office_locations;

-- =============================================================================
-- Reinsert office locations with correct department assignments
-- =============================================================================

INSERT INTO office_locations (name, building, department, office_name, display_name) VALUES
  -- Department of Land Warfare
  ('Head of Department Office', 'Academic Block A', 'Department of Land Warfare', 'Head of Department Office', 'Academic Block A — Head of Department Office'),
  ('Director of Studies Office', 'Academic Block A', 'Department of Land Warfare', 'Director of Studies Office', 'Academic Block A — Director of Studies Office'),
  ('Chief Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Chief Instructor Office', 'Academic Block A — Chief Instructor Office'),
  ('Senior Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Senior Instructor Office', 'Academic Block A — Senior Instructor Office'),
  ('Instructor Office', 'Academic Block A', 'Department of Land Warfare', 'Instructor Office', 'Academic Block A — Instructor Office'),
  ('Staff Office', 'Academic Block A', 'Department of Land Warfare', 'Staff Office', 'Academic Block A — Staff Office'),
  ('Seminar Room', 'Academic Block A', 'Department of Land Warfare', 'Seminar Room', 'Academic Block A — Seminar Room'),

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
  ('FYA Block', 'Academic Block', 'Department of Joint Studies', 'FYA Block', 'Academic Block — FYA Block'),
  ('FYA Auditorium', 'Academic Block', 'Department of Joint Studies', 'FYA Auditorium', 'Academic Block — FYA Auditorium'),
  ('Danjuma Hall', 'Academic Block', 'Department of Joint Studies', 'Danjuma Hall', 'Academic Block — Danjuma Hall'),
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
  ('Communications Room', 'Communications Building', 'Signals', 'Communications Room', 'Communications Building — Communications Room')
ON CONFLICT (name, department, building) DO UPDATE SET
  office_name = EXCLUDED.office_name,
  display_name = EXCLUDED.display_name;

-- =============================================================================
-- Verification
-- =============================================================================

-- 1. Verify office_locations distribution by department
SELECT department, COUNT(*) AS count
FROM office_locations
GROUP BY department
ORDER BY department;

-- 2. Verify positions has no department column (should return 0 rows)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'positions'
  AND column_name = 'department';

-- 3. Verify office_locations has correct departments for key locations
SELECT name, department, building
FROM office_locations
WHERE name IN (
  'FYA Block',
  'Commandant''s Office',
  'ICT Building Room 101',
  'Quarter Guard',
  'Accounts Office',
  'Librarian Office',
  'Medical Officer Office',
  'Head of Department Office'
)
ORDER BY department, name;
