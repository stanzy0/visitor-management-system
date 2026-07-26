-- ==================================================
-- VISITOR LIFECYCLE AUTOMATION
-- ==================================================

-- 1. lifecycle_events
-- ==================================================
CREATE TABLE IF NOT EXISTS public.lifecycle_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id TEXT NOT NULL,
  event TEXT NOT NULL,
  from_status TEXT NULL,
  to_status TEXT NULL,
  performed_by TEXT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_events_visit_id ON public.lifecycle_events (visit_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_events_created_at ON public.lifecycle_events (created_at);

-- 2. Row Level Security
-- ==================================================
ALTER TABLE public.lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Security and Admin can view lifecycle events"
  ON public.lifecycle_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('Admin', 'Security', 'Receptionist')
    )
  );

CREATE POLICY "System can insert lifecycle events"
  ON public.lifecycle_events
  FOR INSERT
  WITH CHECK (true);
