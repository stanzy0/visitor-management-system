-- Fix visitor_documents schema mismatch, add visits.expires_at, and add employees.status
-- This migration safely upgrades the existing schema without losing data

-- =============================================================================
-- visitor_documents: complete missing columns
-- =============================================================================

ALTER TABLE public.visitor_documents
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS mime_type TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID REFERENCES public.user_roles(user_id),
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- =============================================================================
-- Backfill: convert verified boolean -> verification_status text
-- =============================================================================

UPDATE public.visitor_documents
SET verification_status = CASE WHEN verified THEN 'Verified' ELSE 'Pending' END
WHERE verification_status = 'Pending'
  AND verified IS NOT NULL;

-- =============================================================================
-- Backfill: rename notes -> verification_notes
-- =============================================================================

UPDATE public.visitor_documents
SET verification_notes = notes
WHERE verification_notes IS NULL
  AND notes IS NOT NULL;

-- =============================================================================
-- Backfill: populate file metadata from legacy front_image_url
-- =============================================================================

UPDATE public.visitor_documents
SET
  file_url = front_image_url,
  file_name = CASE
    WHEN front_image_url IS NOT NULL THEN
      REGEXP_REPLACE(
        REGEXP_REPLACE(front_image_url, '^.*\\/', ''),
        '\\?.*$', ''
      )
    ELSE NULL
  END,
  mime_type = CASE
    WHEN front_image_url ILIKE '%.jpg%' OR front_image_url ILIKE '%.jpeg%' THEN 'image/jpeg'
    WHEN front_image_url ILIKE '%.png%' THEN 'image/png'
    WHEN front_image_url ILIKE '%.webp%' THEN 'image/webp'
    WHEN front_image_url ILIKE '%.pdf%' THEN 'application/pdf'
    ELSE NULL
  END,
  uploaded_at = created_at
WHERE file_url IS NULL
  AND front_image_url IS NOT NULL;

-- =============================================================================
-- Indexes for new columns
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_visitor_documents_verification_status
  ON public.visitor_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_visitor_documents_uploaded_at
  ON public.visitor_documents(uploaded_at);

CREATE INDEX IF NOT EXISTS idx_visitor_documents_file_url
  ON public.visitor_documents(file_url);

-- =============================================================================
-- visits: add expires_at for dashboard security checks
-- =============================================================================

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill from visitor_badges where a badge exists for the visit
UPDATE public.visits
SET expires_at = vb.expires_at
FROM public.visitor_badges vb
WHERE vb.visit_id = visits.id
  AND visits.expires_at IS NULL;

-- Backfill remaining checked-in/approved visits with a sensible default
UPDATE public.visits
SET expires_at = COALESCE(check_out_time, check_in_time, scheduled_date, created_at) + INTERVAL '1 day'
WHERE expires_at IS NULL
  AND status IN ('checked_in', 'approved');

CREATE INDEX IF NOT EXISTS idx_visits_expires_at
  ON public.visits(expires_at);

-- =============================================================================
-- employees: add status column for dashboard queries
-- =============================================================================

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

UPDATE public.employees
SET status = 'active'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_employees_status
  ON public.employees(status);
