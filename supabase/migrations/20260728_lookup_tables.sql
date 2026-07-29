-- Migration: Create departments and positions lookup tables
-- Date: 2026-07-28
-- Description: Standardized organizational lookup tables for AFCSC

-- =============================================================================
-- departments table
-- =============================================================================

CREATE TABLE IF NOT EXISTS departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Seed standard AFCSC departments
INSERT INTO departments (name) VALUES
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
  ('Headquarters')
ON CONFLICT (name) DO NOTHING;

-- =============================================================================
-- positions table
-- =============================================================================

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Seed standard AFCSC positions
INSERT INTO positions (title, department) VALUES
  ('Commandant', 'Headquarters'),
  ('Deputy Commandant', 'Headquarters'),
  ('Director of Studies', 'Academic'),
  ('Director', 'Headquarters'),
  ('Chief Instructor', 'Academic'),
  ('Senior Instructor', 'Academic'),
  ('Instructor', 'Academic'),
  ('Staff Officer', 'Administration'),
  ('Administrative Officer', 'Administration'),
  ('Reception Officer', 'Registry'),
  ('Security Officer', 'Security'),
  ('ICT Staff', 'ICT Department'),
  ('Medical Officer', 'Medical Services'),
  ('Accountant', 'Finance'),
  ('Librarian', 'Library'),
  ('Clerk', 'Registry')
ON CONFLICT (title, department) DO NOTHING;
