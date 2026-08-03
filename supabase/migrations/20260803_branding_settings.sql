-- Migration: Create branding_settings table and storage bucket

CREATE TABLE IF NOT EXISTS branding_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  college_name TEXT NOT NULL DEFAULT 'AFCSC Visitor Management',
  logo_url TEXT,
  login_background_url TEXT,
  badge_template_url TEXT,
  signature_url TEXT,
  stamp_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#0B3D91',
  secondary_color TEXT NOT NULL DEFAULT '#1F6FEB',
  accent_color TEXT NOT NULL DEFAULT '#D4AF37',
  badge_header_text TEXT NOT NULL DEFAULT 'VISITOR',
  badge_footer_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO branding_settings (id) VALUES ('00000000-0000-0000-0000-000000000000')
ON CONFLICT (id) DO NOTHING;
