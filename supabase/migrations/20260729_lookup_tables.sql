-- Migration: Create departments and positions lookup tables
-- Date: 2026-07-29
-- Description: Standardized dropdown lookup tables for AFCSC employee management

-- =============================================================================
-- departments
-- =============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view departments"
  ON departments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create departments"
  ON departments FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update departments"
  ON departments FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete departments"
  ON departments FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

INSERT INTO departments (name) VALUES
  ('Headquarters'),
  ('Department of Land Warfare'),
  ('Department of Maritime Warfare'),
  ('Department of Air Warfare'),
  ('Department of Joint Studies'),
  ('ICT Department'),
  ('Registry'),
  ('Administration'),
  ('Finance'),
  ('Logistics'),
  ('Medical Services'),
  ('Library'),
  ('Security'),
  ('Operations'),
  ('Engineering'),
  ('Signals')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- positions
-- =============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT UNIQUE NOT NULL,
  department TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view positions"
  ON positions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create positions"
  ON positions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update positions"
  ON positions FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete positions"
  ON positions FOR DELETE
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_positions_title ON positions(title);
CREATE INDEX IF NOT EXISTS idx_positions_department ON positions(department);

INSERT INTO positions (title, department) VALUES
  -- Headquarters
  ('Commandant', 'Headquarters'),
  ('Deputy Commandant', 'Headquarters'),
  ('Chief of Staff', 'Headquarters'),
  ('Director', 'Headquarters'),
  ('Administrative Officer', 'Headquarters'),
  -- Department of Land Warfare
  ('Head of Department', 'Department of Land Warfare'),
  ('Director of Studies', 'Department of Land Warfare'),
  ('Chief Instructor', 'Department of Land Warfare'),
  ('Senior Instructor', 'Department of Land Warfare'),
  ('Instructor', 'Department of Land Warfare'),
  ('Staff Officer', 'Department of Land Warfare'),
  -- Department of Maritime Warfare
  ('Head of Department', 'Department of Maritime Warfare'),
  ('Director of Studies', 'Department of Maritime Warfare'),
  ('Chief Instructor', 'Department of Maritime Warfare'),
  ('Senior Instructor', 'Department of Maritime Warfare'),
  ('Instructor', 'Department of Maritime Warfare'),
  ('Staff Officer', 'Department of Maritime Warfare'),
  -- Department of Air Warfare
  ('Head of Department', 'Department of Air Warfare'),
  ('Director of Studies', 'Department of Air Warfare'),
  ('Chief Instructor', 'Department of Air Warfare'),
  ('Senior Instructor', 'Department of Air Warfare'),
  ('Instructor', 'Department of Air Warfare'),
  ('Staff Officer', 'Department of Air Warfare'),
  -- Department of Joint Studies
  ('Head of Department', 'Department of Joint Studies'),
  ('Director of Studies', 'Department of Joint Studies'),
  ('Chief Instructor', 'Department of Joint Studies'),
  ('Senior Instructor', 'Department of Joint Studies'),
  ('Instructor', 'Department of Joint Studies'),
  ('Staff Officer', 'Department of Joint Studies'),
  -- ICT Department
  ('ICT Staff', 'ICT Department'),
  ('Network Administrator', 'ICT Department'),
  ('Systems Administrator', 'ICT Department'),
  ('Database Administrator', 'ICT Department'),
  -- Registry
  ('Registrar', 'Registry'),
  ('Reception Officer', 'Registry'),
  ('Records Officer', 'Registry'),
  ('Clerk', 'Registry'),
  -- Finance
  ('Accountant', 'Finance'),
  ('Internal Auditor', 'Finance'),
  ('Payroll Officer', 'Finance'),
  ('Budget Officer', 'Finance'),
  -- Logistics
  ('Logistics Officer', 'Logistics'),
  ('Supply Officer', 'Logistics'),
  ('Stores Officer', 'Logistics'),
  ('Transport Officer', 'Logistics'),
  -- Medical Services
  ('Medical Officer', 'Medical Services'),
  ('Nurse', 'Medical Services'),
  ('Pharmacist', 'Medical Services'),
  -- Library
  ('Librarian', 'Library'),
  ('Assistant Librarian', 'Library'),
  -- Security
  ('Chief Security Officer', 'Security'),
  ('Security Officer', 'Security'),
  ('Gate Supervisor', 'Security'),
  -- Operations
  ('Operations Officer', 'Operations'),
  ('Duty Officer', 'Operations'),
  -- Engineering
  ('Works Officer', 'Engineering'),
  ('Maintenance Officer', 'Engineering'),
  -- Signals
  ('Signals Officer', 'Signals'),
  ('Communications Officer', 'Signals')
ON CONFLICT (title, department) DO NOTHING;
