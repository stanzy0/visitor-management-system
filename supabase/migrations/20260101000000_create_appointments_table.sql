-- ==================================================
-- VISITOR MANAGEMENT SYSTEM — APPOINTMENTS MODULE
-- ==================================================

-- 1. appointments table
-- ==================================================
CREATE TABLE IF NOT EXISTS public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_number TEXT UNIQUE NOT NULL,
  visitor_id TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  office_location TEXT NOT NULL,
  appointment_date TEXT NOT NULL,
  appointment_time TEXT NOT NULL,
  expected_duration INTEGER NOT NULL DEFAULT 30,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Scheduled',
  notes TEXT NULL,
  created_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. indexes
-- ==================================================
CREATE INDEX IF NOT EXISTS idx_appointments_visitor_id ON public.appointments (visitor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_employee_id ON public.appointments (employee_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON public.appointments (status);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments (appointment_date);

-- 3. updated_at trigger
-- ==================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_updated_at ON public.appointments;
CREATE TRIGGER trg_appointments_updated_at
  BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4. Row Level Security
-- ==================================================
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage appointments"
  ON public.appointments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

CREATE POLICY "Employees can view own appointments"
  ON public.appointments
  FOR SELECT
  USING (
    employee_id = (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
  );

-- 5. audit_logs status enum support
-- ==================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'Scheduled',
      'Arrived',
      'Checked In',
      'Completed',
      'Cancelled',
      'No Show'
    );
  END IF;
END $$;
