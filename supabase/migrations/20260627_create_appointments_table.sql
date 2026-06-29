-- Migration: Create appointments table for pre-registration
-- Date: 2026-06-27
-- Description: Appointment & Pre-Registration module for Armed Forces Command and Staff College

-- Create appointments table
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES visitors(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  appointment_date DATE NOT NULL,
  expected_arrival TIME,
  expected_departure TIME,
  purpose TEXT NOT NULL,
  notes TEXT,
  qr_code TEXT,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_by TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_visitor_id ON appointments(visitor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON appointments(employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_qr_code ON appointments(qr_code);

-- Enable Row Level Security
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Authenticated users can view appointments"
ON appointments
FOR SELECT
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can create appointments"
ON appointments
FOR INSERT
TO authenticated
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update appointments"
ON appointments
FOR UPDATE
TO authenticated
USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete appointments"
ON appointments
FOR DELETE
TO authenticated
USING (auth.role() = 'authenticated');

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on appointments table
DROP TRIGGER IF EXISTS update_appointments_updated_at ON appointments;
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();