-- Create vehicles table
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id),
  registration_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('Car', 'SUV', 'Truck', 'Bus', 'Motorcycle', 'Military Vehicle', 'Other')),
  vehicle_make TEXT,
  vehicle_model TEXT,
  vehicle_color TEXT,
  parking_slot TEXT,
  gate_pass_number TEXT NOT NULL UNIQUE,
  driver_name TEXT,
  driver_phone TEXT,
  notes TEXT,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  blacklist_reason TEXT,
  blacklist_date TIMESTAMP,
  blacklist_officer TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create blacklist table for vehicle blacklist records
CREATE TABLE vehicle_blacklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_number TEXT NOT NULL UNIQUE,
  reason TEXT,
  date TIMESTAMP DEFAULT NOW(),
  officer TEXT
);

-- Create trigger to generate gate pass number
CREATE OR REPLACE FUNCTION generate_gate_pass_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.gate_pass_number IS NULL THEN
    NEW.gate_pass_number := 'GP-' || EXTRACT(YEAR FROM NOW()) || '-' || 
      LPAD(NEXTVAL('vehicle_gate_pass_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for gate pass numbering
CREATE SEQUENCE IF NOT EXISTS vehicle_gate_pass_seq START 1;

-- Insert initial vehicle values into sequence (find max existing)
SELECT setval('vehicle_gate_pass_seq', COALESCE((SELECT MAX(CAST(RIGHT(gate_pass_number, 6) AS INTEGER)) FROM vehicles), 0) + 1;

-- Add vehicle stats to dashboard
-- This will be handled in the API layer