-- Emergency Roll Call Phase 2
-- Creates emergency_sessions and roll_call_entries tables

CREATE TABLE IF NOT EXISTS emergency_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  started_by UUID NOT NULL REFERENCES auth.users(id),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  ended_by UUID REFERENCES auth.users(id)
);

CREATE TABLE IF NOT EXISTS roll_call_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES emergency_sessions(id) ON DELETE CASCADE,
  visit_id UUID NOT NULL,
  visitor_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'missing',
  marked_by UUID REFERENCES auth.users(id),
  marked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roll_call_entries_session ON roll_call_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_roll_call_entries_visitor ON roll_call_entries(visitor_id);

ALTER TABLE emergency_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE roll_call_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage emergency sessions" ON emergency_sessions
  FOR ALL USING (auth.uid() IN (SELECT id FROM auth.users));

CREATE POLICY "Admins and Security can view roll call entries" ON roll_call_entries
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role IN ('Admin', 'Security')
    )
  );

CREATE POLICY "Admins and Security can update roll call entries" ON roll_call_entries
  FOR UPDATE USING (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role IN ('Admin', 'Security')
    )
  );

CREATE POLICY "Admins can insert roll call entries" ON roll_call_entries
  FOR INSERT WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM user_roles WHERE role IN ('Admin', 'Security')
    )
  );
