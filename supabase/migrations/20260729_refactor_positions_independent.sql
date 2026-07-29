-- Migration: Refactor positions to be independent of departments
-- Date: 2026-07-29
-- Description: Remove department dependency from positions and seed comprehensive AFCSC job functions

-- =============================================================================
-- Remove department column from positions
-- =============================================================================

ALTER TABLE positions DROP COLUMN IF EXISTS department;

-- =============================================================================
-- Seed comprehensive AFCSC positions (independent of departments)
-- =============================================================================

INSERT INTO positions (title) VALUES
  -- Leadership
  ('Commandant'),
  ('Deputy Commandant'),
  ('Chief of Staff'),
  ('Director'),
  -- Academic
  ('Head of Department'),
  ('Director of Studies'),
  ('Chief Instructor'),
  ('Directing Staff'),
  ('Senior Instructor'),
  ('Instructor'),
  ('Research Fellow'),
  -- Students
  ('Student'),
  ('International Student'),
  -- ICT
  ('ICT Staff'),
  ('Network Administrator'),
  ('Systems Administrator'),
  ('Database Administrator'),
  ('Help Desk Officer'),
  -- Administration
  ('Administrative Officer'),
  ('Executive Assistant'),
  ('Secretary'),
  ('Registry Officer'),
  ('Reception Officer'),
  ('Clerk'),
  ('Human Resources Officer'),
  ('Protocol Officer'),
  ('Public Relations Officer'),
  -- Finance
  ('Accountant'),
  ('Budget Officer'),
  ('Payroll Officer'),
  ('Internal Auditor'),
  -- Logistics
  ('Logistics Officer'),
  ('Supply Officer'),
  ('Store Officer'),
  ('Procurement Officer'),
  ('Transport Officer'),
  -- Medical
  ('Medical Officer'),
  ('Nurse'),
  ('Pharmacist'),
  ('Laboratory Technician'),
  -- Library
  ('Librarian'),
  ('Assistant Librarian'),
  -- Security
  ('Chief Security Officer'),
  ('Security Officer'),
  ('Gate Supervisor'),
  ('Fire Officer'),
  -- Engineering
  ('Works Officer'),
  ('Maintenance Officer'),
  ('Electrical Technician'),
  ('Mechanical Technician'),
  -- Signals
  ('Signals Officer'),
  ('Communications Officer'),
  -- Support Staff
  ('Driver'),
  ('Cleaner'),
  ('Messenger'),
  ('Office Assistant')
ON CONFLICT (title) DO NOTHING;

-- =============================================================================
-- Drop department index since column is removed
-- =============================================================================

DROP INDEX IF EXISTS idx_positions_department;
