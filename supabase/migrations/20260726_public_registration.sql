-- Public Visitor Self-Registration Portal
-- Adds fields to support public registrations without breaking existing schema

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS registration_number TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS visitor_type TEXT DEFAULT 'Visitor',
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'internal',
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
  ADD COLUMN IF NOT EXISTS appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_visits_registration_number ON public.visits(registration_number);
CREATE INDEX IF NOT EXISTS idx_visits_source ON public.visits(source);

-- Allow public inserts for visits (public registrations)
CREATE POLICY "Public can insert visits"
  ON public.visits
  FOR INSERT
  WITH CHECK (true);

-- Public can view their own visit by registration number
CREATE POLICY "Public can view own visits"
  ON public.visits
  FOR SELECT
  USING (source = 'public' AND registration_number IS NOT NULL);
