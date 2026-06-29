-- Migration: Add office_location column to employees and rename company to visitor_organization in visitors
-- Date: 2026-06-27
-- Description: Refactor for Armed Forces Command and Staff College workflow

-- Add office_location column to employees table
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS office_location TEXT;

-- Rename company column to visitor_organization in visitors table
-- First check if the column exists and rename it
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'visitors' AND column_name = 'company') THEN
        ALTER TABLE visitors RENAME COLUMN company TO visitor_organization;
    END IF;
END $$;

-- If renaming doesn't work due to constraints, add the new column and migrate data
-- This handles the case where the column might not exist or renaming fails
DO $$
BEGIN
    -- Only add visitor_organization if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'visitors' AND column_name = 'visitor_organization') THEN
        ALTER TABLE visitors ADD COLUMN visitor_organization TEXT;
        
        -- Copy data from company to visitor_organization if company exists
        IF EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'visitors' AND column_name = 'company') THEN
            UPDATE visitors SET visitor_organization = company WHERE visitor_organization IS NULL;
        END IF;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON COLUMN employees.office_location IS 'Office location for the employee (e.g., ICT Building – Room 204)';
COMMENT ON COLUMN visitors.visitor_organization IS 'Organization the visitor represents (e.g., Nigerian Army Headquarters)';

-- Create index for better search performance on visitor_organization
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_organization ON visitors(visitor_organization);

-- Create index for better search performance on office_location
CREATE INDEX IF NOT EXISTS idx_employees_office_location ON employees(office_location);