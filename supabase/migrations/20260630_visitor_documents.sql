-- Visitor Documents module
CREATE TABLE IF NOT EXISTS public.visitor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  issuing_country TEXT,
  expiry_date DATE,
  front_image_url TEXT NOT NULL,
  back_image_url TEXT,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  verified_by UUID REFERENCES public.user_roles(user_id),
  verification_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_documents_visitor_id ON public.visitor_documents(visitor_id);
CREATE INDEX IF NOT EXISTS idx_visitor_documents_document_number ON public.visitor_documents(document_number);
CREATE INDEX IF NOT EXISTS idx_visitor_documents_document_type ON public.visitor_documents(document_type);

CREATE OR REPLACE FUNCTION update_visitor_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_visitor_documents_updated_at
  BEFORE UPDATE ON public.visitor_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_documents_updated_at();

ALTER TABLE public.visitor_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage documents"
  ON public.visitor_documents
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE POLICY "Security can view and manage documents"
  ON public.visitor_documents
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

CREATE POLICY "Security can insert documents"
  ON public.visitor_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

CREATE POLICY "Security can update documents"
  ON public.visitor_documents
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

CREATE POLICY "Receptionist can view and insert documents"
  ON public.visitor_documents
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

CREATE POLICY "Receptionist can insert documents"
  ON public.visitor_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

CREATE POLICY "Receptionist can update documents before check-in"
  ON public.visitor_documents
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
    AND NOT EXISTS (
      SELECT 1 FROM public.visits WHERE visits.visitor_id = visitor_documents.visitor_id AND visits.status = 'checked_in'
    )
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

ALTER TABLE public.visitor_documents REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_documents;
