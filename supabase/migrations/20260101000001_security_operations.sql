-- ==================================================
-- SECURITY OPERATIONS MODULE
-- ==================================================

-- 1. watchlist
-- ==================================================
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  photo_url TEXT NULL,
  reason TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  document_number TEXT NULL,
  phone TEXT NULL,
  email TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_watchlist_name ON public.watchlist (full_name);
CREATE INDEX IF NOT EXISTS idx_watchlist_document_number ON public.watchlist (document_number);
CREATE INDEX IF NOT EXISTS idx_watchlist_active ON public.watchlist (is_active);

-- 2. security_alerts
-- ==================================================
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'Medium',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id TEXT NULL,
  related_type TEXT NULL,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_at TIMESTAMPTZ NULL,
  resolved_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_related ON public.security_alerts (related_type, related_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_resolved ON public.security_alerts (is_resolved);

-- 3. gate_activities
-- ==================================================
CREATE TABLE IF NOT EXISTS public.gate_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  visit_id TEXT NULL,
  badge_id TEXT NULL,
  activity_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  gate TEXT NULL,
  verified_by TEXT NULL,
  verification_method TEXT NULL,
  decision TEXT NULL,
  denial_reason TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gate_activities_visitor_id ON public.gate_activities (visitor_id);
CREATE INDEX IF NOT EXISTS idx_gate_activities_visit_id ON public.gate_activities (visit_id);
CREATE INDEX IF NOT EXISTS idx_gate_activities_created_at ON public.gate_activities (created_at);

-- 4. security_decisions
-- ==================================================
CREATE TABLE IF NOT EXISTS public.security_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id TEXT NOT NULL,
  visit_id TEXT NULL,
  decision TEXT NOT NULL,
  reason TEXT NULL,
  decided_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_decisions_visitor_id ON public.security_decisions (visitor_id);
CREATE INDEX IF NOT EXISTS idx_security_decisions_visit_id ON public.security_decisions (visit_id);

-- 5. Row Level Security
-- ==================================================
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gate_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage watchlist"
  ON public.watchlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Security can view watchlist"
  ON public.watchlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security')
    )
  );

CREATE POLICY "Security can manage alerts"
  ON public.security_alerts
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security')
    )
  );

CREATE POLICY "Security can manage gate activities"
  ON public.gate_activities
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security')
    )
  );

CREATE POLICY "Security can manage decisions"
  ON public.security_decisions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security')
    )
  );

-- 6. updated_at triggers
-- ==================================================
DROP TRIGGER IF EXISTS trg_watchlist_updated_at ON public.watchlist;
CREATE TRIGGER trg_watchlist_updated_at
  BEFORE UPDATE ON public.watchlist
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
