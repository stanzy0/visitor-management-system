-- Migration: Create office_locations table and migrate existing data
-- Date: 2026-06-27
-- Description: Standardized office locations for Armed Forces Command and Staff College

-- Create office_locations table
CREATE TABLE IF NOT EXISTS office_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  building TEXT,
  department TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE office_locations ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view office locations"
ON office_locations
FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create office locations"
ON office_locations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update office locations"
ON office_locations
FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can delete office locations"
ON office_locations
FOR DELETE
TO authenticated
USING (true);

-- Insert standard office locations for Armed Forces Command and Staff College
INSERT INTO office_locations (name, building, department) VALUES
  ('Department of Land Warfare', NULL, 'Academic'),
  ('Department of Maritime Warfare', NULL, 'Academic'),
  ('Department of Air Warfare', NULL, 'Academic'),
  ('Department of Joint Studies', NULL, 'Academic'),
  ('Commandants Office', 'Administration Block', 'Commandant'),
  ('Quarter Guard', NULL, 'Security'),
  ('Main Auditorium', 'Academic Block', 'Events'),
  ('Library Office', NULL, 'Library'),
  ('Logistics Office', 'Administration Block', 'Logistics'),
  ('Clinic', NULL, 'Medical'),
  ('Danjuma Hall', NULL, 'Events'),
  ('FYA Auditorium', NULL, 'Events')
ON CONFLICT (name) DO NOTHING;

-- Migrate existing unique office_location values from employees to office_locations
INSERT INTO office_locations (name)
SELECT DISTINCT office_location
FROM employees
WHERE office_location IS NOT NULL
ON CONFLICT (name) DO NOTHING;

-- Create indexes for search performance
CREATE INDEX IF NOT EXISTS idx_office_locations_name ON office_locations(name);
CREATE INDEX IF NOT EXISTS idx_office_locations_building ON office_locations(building);
CREATE INDEX IF NOT EXISTS idx_office_locations_department ON office_locations(department);