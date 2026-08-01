-- Database constraints for data integrity
-- Ensures critical fields are NOT NULL and remain unique

-- Make registration_number NOT NULL (already unique)
ALTER TABLE visits 
  ALTER COLUMN registration_number SET NOT NULL;

-- Make visitor_id NOT NULL on visits
ALTER TABLE visits 
  ALTER COLUMN visitor_id SET NOT NULL;

-- Make employee_id NOT NULL on visits
ALTER TABLE visits 
  ALTER COLUMN employee_id SET NOT NULL;

-- Ensure qr_token is NOT NULL and UNIQUE on visitor_badges
ALTER TABLE visitor_badges 
  ALTER COLUMN qr_token SET NOT NULL;

ALTER TABLE visitor_badges 
  ADD CONSTRAINT visitor_badges_qr_token_unique UNIQUE (qr_token);

-- Ensure badge_number is NOT NULL and UNIQUE
ALTER TABLE visitor_badges 
  ALTER COLUMN badge_number SET NOT NULL;

ALTER TABLE visitor_badges 
  ADD CONSTRAINT visitor_badges_badge_number_unique UNIQUE (badge_number);

-- Ensure registration_number is UNIQUE on visits (may already be unique)
ALTER TABLE visits 
  ADD CONSTRAINT IF NOT EXISTS visits_registration_number_unique UNIQUE (registration_number);

-- Ensure visitor_id is NOT NULL on visitor_documents
ALTER TABLE visitor_documents 
  ALTER COLUMN visitor_id SET NOT NULL;

-- Ensure visit_id is NOT NULL on visitor_badges
ALTER TABLE visitor_badges 
  ALTER COLUMN visit_id SET NOT NULL;

-- Comments for documentation
COMMENT ON CONSTRAINT visitor_badges_qr_token_unique ON visitor_badges IS 'QR tokens must be unique';
COMMENT ON CONSTRAINT visitor_badges_badge_number_unique ON visitor_badges IS 'Badge numbers must be unique';
COMMENT ON CONSTRAINT visits_registration_number_unique ON visits IS 'Registration numbers must be unique';
