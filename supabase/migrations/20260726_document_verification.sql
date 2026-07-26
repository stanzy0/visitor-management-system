-- Document Verification & Approval Center
-- Migration: 20260726_document_verification.sql

-- Create document_verifications table
CREATE TABLE IF NOT EXISTS document_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID REFERENCES visitors(id) ON DELETE CASCADE,
  visit_id UUID REFERENCES visits(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Replacement Requested', 'Reuploaded')),
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_reason TEXT,
  replacement_requested BOOLEAN DEFAULT FALSE,
  replacement_uploaded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_document_verifications_visitor_id ON document_verifications(visitor_id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_visit_id ON document_verifications(visit_id);
CREATE INDEX IF NOT EXISTS idx_document_verifications_status ON document_verifications(status);
CREATE INDEX IF NOT EXISTS idx_document_verifications_created_at ON document_verifications(created_at DESC);

-- Enable RLS
ALTER TABLE document_verifications ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin and Security can view all verifications"
  ON document_verifications FOR SELECT TO authenticated
  USING (
    (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security', 'Receptionist')
  );

CREATE POLICY "Users can view their own verifications"
  ON document_verifications FOR SELECT TO authenticated
  USING (
    visitor_id IN (
      SELECT id FROM visitors WHERE email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    )
  );

CREATE POLICY "Admin and Reception can insert verifications"
  ON document_verifications FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist')
  );

CREATE POLICY "Admin and Reception can update verifications"
  ON document_verifications FOR UPDATE TO authenticated
  USING (
    (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist')
  );

CREATE POLICY "Admin can delete verifications"
  ON document_verifications FOR DELETE TO authenticated
  USING (
    (SELECT role FROM user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

-- Update visitor_documents verification_status to support new statuses
ALTER TABLE visitor_documents
  ADD COLUMN IF NOT EXISTS visit_id UUID REFERENCES visits(id) ON DELETE CASCADE;

ALTER TABLE visitor_documents
  ADD COLUMN IF NOT EXISTS replacement_requested BOOLEAN DEFAULT FALSE;

ALTER TABLE visitor_documents
  ADD COLUMN IF NOT EXISTS replacement_uploaded BOOLEAN DEFAULT FALSE;

ALTER TABLE visitor_documents
  ADD COLUMN IF NOT EXISTS verification_history JSONB DEFAULT '[]'::jsonb;

-- Create index for visit_id
CREATE INDEX IF NOT EXISTS idx_visitor_documents_visit_id ON visitor_documents(visit_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_document_verifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_document_verifications_updated_at ON document_verifications;
CREATE TRIGGER update_document_verifications_updated_at
  BEFORE UPDATE ON document_verifications
  FOR EACH ROW
  EXECUTE FUNCTION update_document_verifications_updated_at();
