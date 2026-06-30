-- Visitor Watchlist module

CREATE TABLE IF NOT EXISTS public.visitor_watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  id_number TEXT,
  visitor_organization TEXT,
  vehicle_registration TEXT,
  status TEXT NOT NULL DEFAULT 'Active',
  category TEXT NOT NULL DEFAULT 'Security Alert',
  reason TEXT,
  notes TEXT,
  added_by UUID NOT NULL REFERENCES public.user_roles(user_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_full_name ON public.visitor_watchlist(full_name);
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_phone ON public.visitor_watchlist(phone);
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_email ON public.visitor_watchlist(email);
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_id_number ON public.visitor_watchlist(id_number);
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_vehicle_registration ON public.visitor_watchlist(vehicle_registration);
CREATE INDEX IF NOT EXISTS idx_visitor_watchlist_status ON public.visitor_watchlist(status);

-- Enable Row Level Security
ALTER TABLE public.visitor_watchlist ENABLE ROW LEVEL SECURITY;

-- Policies: Admin full CRUD
CREATE POLICY "Admin can manage watchlist"
  ON public.visitor_watchlist
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

-- Policies: Security can view, create, update
CREATE POLICY "Security can view watchlist"
  ON public.visitor_watchlist
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

CREATE POLICY "Security can insert watchlist"
  ON public.visitor_watchlist
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

CREATE POLICY "Security can update watchlist"
  ON public.visitor_watchlist
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  )
  WITH CHECK (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) IN ('Admin', 'Security')
  );

-- Receptionist can only view (no CRUD)
CREATE POLICY "Receptionist can view watchlist"
  ON public.visitor_watchlist
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

-- Enable Realtime
ALTER TABLE public.visitor_watchlist REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitor_watchlist;
