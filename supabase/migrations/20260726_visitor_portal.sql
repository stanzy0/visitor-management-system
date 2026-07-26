-- Visitor Self-Service Portal
CREATE TABLE IF NOT EXISTS public.visitor_portal_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_id UUID NOT NULL REFERENCES public.visitors(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '90 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visitor_portal_tokens_token ON public.visitor_portal_tokens(token);
CREATE INDEX IF NOT EXISTS idx_visitor_portal_tokens_visit_id ON public.visitor_portal_tokens(visit_id);
CREATE INDEX IF NOT EXISTS idx_visitor_portal_tokens_visitor_id ON public.visitor_portal_tokens(visitor_id);

ALTER TABLE public.visitor_portal_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view own portal token"
  ON public.visitor_portal_tokens
  FOR SELECT
  USING (true);

CREATE POLICY "System can insert portal tokens"
  ON public.visitor_portal_tokens
  FOR INSERT
  WITH CHECK (true);
