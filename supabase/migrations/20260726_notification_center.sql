-- Notification & Communication Center
-- Adds priority and action_url to notifications table

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Critical'));

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS action_url TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_priority ON public.notifications(priority);
CREATE INDEX IF NOT EXISTS idx_notifications_action_url ON public.notifications(action_url);
