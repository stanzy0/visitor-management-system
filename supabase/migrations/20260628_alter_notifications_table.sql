ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS user_id uuid;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'System';

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS recipient_role TEXT NULL;

UPDATE public.notifications
  SET user_id = recipient_user_id
  WHERE user_id IS NULL AND recipient_user_id IS NOT NULL;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS employee_id;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS recipient_user_id;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS entity_type;

ALTER TABLE public.notifications
  DROP COLUMN IF EXISTS entity_id;

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);