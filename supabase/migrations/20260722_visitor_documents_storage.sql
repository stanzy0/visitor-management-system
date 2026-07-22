-- Storage bucket for visitor documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'visitor-documents',
  'visitor-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Admins can manage documents storage"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  )
  WITH CHECK (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );

CREATE POLICY "Receptionist can upload documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

CREATE POLICY "Receptionist can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Receptionist'
  );

CREATE POLICY "Security can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Security'
  );

CREATE POLICY "Admin can view documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'visitor-documents' AND
    (SELECT role FROM public.user_roles WHERE user_id = (SELECT auth.uid())) = 'Admin'
  );
