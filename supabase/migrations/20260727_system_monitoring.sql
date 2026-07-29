-- System Monitoring & Maintenance Center
-- Creates tables for background jobs, system logs, error tracking, and performance metrics

-- Background Jobs
CREATE TABLE IF NOT EXISTS public.system_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'idle',
  last_run TIMESTAMPTZ NULL,
  last_duration_ms INT NULL,
  next_run TIMESTAMPTZ NULL,
  records_processed INT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_jobs_name ON public.system_jobs(job_name);
CREATE INDEX IF NOT EXISTS idx_system_jobs_status ON public.system_jobs(status);

-- System Logs
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  user_id UUID NULL,
  user_email TEXT NULL,
  ip_address TEXT NULL,
  metadata JSONB NULL,
  stack_trace TEXT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_logs_module ON public.system_logs(module);
CREATE INDEX IF NOT EXISTS idx_system_logs_severity ON public.system_logs(severity);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_resolved ON public.system_logs(resolved);

-- Performance Metrics
CREATE TABLE IF NOT EXISTS public.performance_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value_ms INT NOT NULL,
  metadata JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON public.performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON public.performance_metrics(created_at);

-- Error Tracking
CREATE TABLE IF NOT EXISTS public.error_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  module TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'error',
  message TEXT NOT NULL,
  stack_trace TEXT NULL,
  user_id UUID NULL,
  user_email TEXT NULL,
  ip_address TEXT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID NULL,
  resolved_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_tracking_module ON public.error_tracking(module);
CREATE INDEX IF NOT EXISTS idx_error_tracking_severity ON public.error_tracking(severity);
CREATE INDEX IF NOT EXISTS idx_error_tracking_resolved ON public.error_tracking(resolved);
CREATE INDEX IF NOT EXISTS idx_error_tracking_created_at ON public.error_tracking(created_at);

-- Storage Monitoring
CREATE TABLE IF NOT EXISTS public.storage_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_name TEXT NOT NULL,
  file_count INT NOT NULL DEFAULT 0,
  total_size_bytes BIGINT NOT NULL DEFAULT 0,
  largest_file_bytes BIGINT NULL,
  oldest_file_at TIMESTAMPTZ NULL,
  newest_file_at TIMESTAMPTZ NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_storage_monitoring_bucket ON public.storage_monitoring(bucket_name);
CREATE INDEX IF NOT EXISTS idx_storage_monitoring_checked_at ON public.storage_monitoring(checked_at);

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_system_jobs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_system_jobs_updated_at ON public.system_jobs;
CREATE TRIGGER trigger_update_system_jobs_updated_at
  BEFORE UPDATE ON public.system_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_system_jobs_updated_at();

-- RLS Policies
ALTER TABLE public.system_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.storage_monitoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system_jobs" ON public.system_jobs
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can view system_logs" ON public.system_logs
  FOR SELECT USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can insert system_logs" ON public.system_logs
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can update system_logs" ON public.system_logs
  FOR UPDATE USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage performance_metrics" ON public.performance_metrics
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage error_tracking" ON public.error_tracking
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

CREATE POLICY "Admins can manage storage_monitoring" ON public.storage_monitoring
  FOR ALL USING (
    auth.uid() IN (SELECT user_id FROM public.user_roles WHERE role = 'Admin')
  );

-- Realtime
ALTER TABLE public.system_jobs REPLICA IDENTITY FULL;
ALTER TABLE public.system_logs REPLICA IDENTITY FULL;
ALTER TABLE public.performance_metrics REPLICA IDENTITY FULL;
ALTER TABLE public.error_tracking REPLICA IDENTITY FULL;
ALTER TABLE public.storage_monitoring REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.system_jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.system_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.performance_metrics;
ALTER PUBLICATION supabase_realtime ADD TABLE public.error_tracking;
ALTER PUBLICATION supabase_realtime ADD TABLE public.storage_monitoring;
