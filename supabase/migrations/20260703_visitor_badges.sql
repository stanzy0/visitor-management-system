-- Visitor Badge & QR Code Management
CREATE TABLE IF NOT EXISTS public.visitor_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  badge_number TEXT NOT NULL UNIQUE,
  qr_token TEXT NOT NULL UNIQUE,
  badge_status TEXT NOT NULL DEFAULT 'Active',
  issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 day',
  printed_at TIMESTAMPTZ,
  printed_by UUID REFERENCES public.user_roles(user_id),
  reprint_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_badges_visit_id ON public.visitor_badges(visit_id);
CREATE INDEX IF NOT EXISTS idx_visitor_badges_qr_token ON public.visitor_badges(qr_token);
CREATE INDEX IF NOT EXISTS idx_visitor_badges_badge_number ON public.visitor_badges(badge_number);
CREATE INDEX IF NOT EXISTS idx_visitor_badges_status ON public.visitor_badges(badge_status);

CREATE SEQUENCE IF NOT EXISTS visitor_badge_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_visitor_badge_number()
RETURNS TEXT AS $$
DECLARE
  next_val BIGINT;
  badge_num TEXT;
BEGIN
  SELECT nextval('visitor_badge_number_seq') INTO next_val;
  badge_num := 'VMS-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(next_val::TEXT, 6, '0');
  RETURN badge_num;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_visitor_badges_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_visitor_badges_updated_at_trigger ON public.visitor_badges;
CREATE TRIGGER update_visitor_badges_updated_at_trigger
  BEFORE UPDATE ON public.visitor_badges
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_badges_updated_at();

ALTER TABLE public.visitor_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage badges"
  ON public.visitor_badges
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE POLICY "Receptionist can manage badges"
  ON public.visitor_badges
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Receptionist', 'Admin')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Receptionist', 'Admin')
  );

CREATE POLICY "Security can view badges"
  ON public.visitor_badges
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Security', 'Admin')
  );

CREATE POLICY "Host Employee can view badges"
  ON public.visitor_badges
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Host Employee'
  );

ALTER TABLE public.visitor_badges REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_badges;
