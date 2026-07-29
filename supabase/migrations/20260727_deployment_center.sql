-- Backup, Disaster Recovery & Deployment Center
-- Creates tables for backups, deployments, maintenance mode, and health checks

-- Backups
CREATE TABLE IF NOT EXISTS public.backups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_type TEXT NOT NULL,
  backup_size_bytes BIGINT NULL,
  tables JSONB NULL,
  storage_size_bytes BIGINT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  checksum TEXT NULL,
  metadata JSONB NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_backups_status ON public.backups(status);
CREATE INDEX IF NOT EXISTS idx_backups_created_at ON public.backups(created_at);

-- Deployments
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  commit_hash TEXT NULL,
  build_number TEXT NULL,
  environment TEXT NOT NULL DEFAULT 'production',
  status TEXT NOT NULL DEFAULT 'success',
  rolled_back BOOLEAN NOT NULL DEFAULT FALSE,
  deployed_by UUID NULL,
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON public.deployments(deployed_at);

-- Maintenance Mode
CREATE TABLE IF NOT EXISTS public.maintenance_mode (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  message TEXT NULL,
  started_at TIMESTAMPTZ NULL,
  started_by UUID NULL,
  ended_at TIMESTAMPTZ NULL,
  ended_by UUID NULL
);

CREATE INDEX IF NOT EXISTS idx_maintenance_mode_enabled ON public.maintenance_mode(enabled);

-- System Info / Health Checks
CREATE TABLE IF NOT EXISTS public.system_info (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpu_usage_percent DECIMAL NULL,
  memory_usage_percent DECIMAL NULL,
  disk_usage_percent DECIMAL NULL,
  storage_usage_bytes BIGINT NULL,
  database_size_bytes BIGINT NULL,
  realtime_status TEXT NULL,
  active_sessions INT NULL,
  logged_in_users INT NULL,
  api_response_time_ms INT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_info_checked_at ON public.system_info(checked_at);

-- Configuration Snapshots
CREATE TABLE IF NOT EXISTS public.configuration_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  configuration JSONB NOT NULL,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_configuration_snapshots_created_at ON public.configuration_snapshots(created_at);

-- Health Checks
CREATE TABLE IF NOT EXISTS public.health_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_checks_component ON public.health_checks(component);
CREATE INDEX IF NOT EXISTS idx_health_checks_checked_at ON public.health_checks(checked_at);

-- RLS Policies
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_mode ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuration_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage backups" ON public.backups
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage deployments" ON public.deployments
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage maintenance_mode" ON public.maintenance_mode
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can view system_info" ON public.system_info
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can insert system_info" ON public.system_info
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage configuration_snapshots" ON public.configuration_snapshots
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage health_checks" ON public.health_checks
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

-- Realtime
ALTER TABLE public.backups REPLICA IDENTITY FULL;
ALTER TABLE public.deployments REPLICA IDENTITY FULL;
ALTER TABLE public.maintenance_mode REPLICA IDENTITY FULL;
ALTER TABLE public.system_info REPLICA IDENTITY FULL;
ALTER TABLE public.configuration_snapshots REPLICA IDENTITY FULL;
ALTER TABLE public.health_checks REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.backups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.deployments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.maintenance_mode;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_info;
ALTER PUBLICATION supabase_realtime ADD TABLE public.configuration_snapshots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.health_checks;
