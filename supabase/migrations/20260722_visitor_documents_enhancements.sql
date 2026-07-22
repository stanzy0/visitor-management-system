-- Visitor Documents Module Enhancements
-- Adds missing columns for file management and verification workflow

ALTER TABLE public.visitor_documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.user_roles(user_id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.user_roles(user_id);

UPDATE public.visitor_documents
SET verification_status = CASE WHEN verified THEN 'Verified' ELSE 'Pending' END
WHERE verification_status = 'Pending';
