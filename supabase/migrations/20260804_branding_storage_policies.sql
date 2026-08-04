-- Migration: Branding storage policies
-- Date: 2026-08-04
-- Description: Create storage policies for the branding bucket.
--              Public read, Admin upload/update/delete only.

-- =============================================================================
-- Storage Policies for branding bucket
-- =============================================================================

-- Public can view branding assets (read-only)
CREATE POLICY "Public can view branding assets"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'branding');

-- Admin can upload branding assets
CREATE POLICY "Admin can upload branding assets"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'branding'
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- Admin can update branding assets
CREATE POLICY "Admin can update branding assets"
  ON storage.objects
  FOR UPDATE
  USING (
    bucket_id = 'branding'
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );

-- Admin can delete branding assets
CREATE POLICY "Admin can delete branding assets"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'branding'
    AND
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'Admin'
    )
  );
