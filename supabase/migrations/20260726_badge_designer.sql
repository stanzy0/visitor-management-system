-- Badge Designer & Printing Management System
CREATE TABLE IF NOT EXISTS public.badge_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  badge_size TEXT NOT NULL DEFAULT 'CR80',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  background_image TEXT,
  logo_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#2563eb',
  secondary_color TEXT NOT NULL DEFAULT '#1e40af',
  text_color TEXT NOT NULL DEFAULT '#111827',
  qr_position TEXT NOT NULL DEFAULT 'right',
  photo_position TEXT NOT NULL DEFAULT 'left',
  expiry_display BOOLEAN NOT NULL DEFAULT TRUE,
  department_display BOOLEAN NOT NULL DEFAULT TRUE,
  office_display BOOLEAN NOT NULL DEFAULT TRUE,
  signature_area BOOLEAN NOT NULL DEFAULT FALSE,
  layout JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.user_roles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_templates_name ON public.badge_templates(name);
CREATE INDEX IF NOT EXISTS idx_badge_templates_is_default ON public.badge_templates(is_default);

CREATE OR REPLACE FUNCTION update_badge_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_badge_templates_updated_at ON public.badge_templates;

CREATE TRIGGER trigger_update_badge_templates_updated_at
  BEFORE UPDATE ON public.badge_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_badge_templates_updated_at();

ALTER TABLE public.badge_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage badge templates"
  ON public.badge_templates
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE TABLE IF NOT EXISTS public.printers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  printer_type TEXT NOT NULL DEFAULT 'thermal',
  paper_size TEXT NOT NULL DEFAULT 'CR80',
  orientation TEXT NOT NULL DEFAULT 'landscape',
  margins JSONB NOT NULL DEFAULT '{"top": 5, "right": 5, "bottom": 5, "left": 5}'::jsonb,
  copies INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_printers_is_default ON public.printers(is_default);

CREATE OR REPLACE FUNCTION update_printers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_printers_updated_at ON public.printers;

CREATE TRIGGER trigger_update_printers_updated_at
  BEFORE UPDATE ON public.printers
  FOR EACH ROW
  EXECUTE FUNCTION update_printers_updated_at();

ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can manage printers"
  ON public.printers
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE TABLE IF NOT EXISTS public.badge_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_id UUID REFERENCES public.visitor_badges(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  performed_by UUID REFERENCES public.user_roles(user_id),
  reason TEXT,
  printer_name TEXT,
  template_name TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badge_history_badge_id ON public.badge_history(badge_id);
CREATE INDEX IF NOT EXISTS idx_badge_history_action ON public.badge_history(action);
CREATE INDEX IF NOT EXISTS idx_badge_history_created_at ON public.badge_history(created_at);

ALTER TABLE public.badge_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view badge history"
  ON public.badge_history
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist', 'Security')
  );

CREATE POLICY "System can insert badge history"
  ON public.badge_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Receptionist', 'Security')
  );

ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS template_id UUID REFERENCES public.badge_templates(id);
ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS printer_id UUID REFERENCES public.printers(id);
ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS revoked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;
ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.user_roles(user_id);
ALTER TABLE public.visitor_badges ADD COLUMN IF NOT EXISTS revoked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_visitor_badges_template_id ON public.visitor_badges(template_id);
CREATE INDEX IF NOT EXISTS idx_visitor_badges_printer_id ON public.visitor_badges(printer_id);
CREATE INDEX IF NOT EXISTS idx_visitor_badges_revoked ON public.visitor_badges(revoked);
