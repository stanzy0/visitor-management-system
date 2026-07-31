-- Allow anonymous users to upload to visitor-documents bucket for public registration
-- This policy allows unauthenticated INSERT into storage.objects for the visitor-documents bucket only
CREATE POLICY "Public can upload documents for registration"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (
    bucket_id = 'visitor-documents'
  );

-- Allow public to view documents in visitor-documents bucket
-- This enables viewing of uploaded document images without authentication
CREATE POLICY "Public can view visitor documents"
  ON storage.objects
  FOR SELECT
  TO public
  USING (
    bucket_id = 'visitor-documents'
  );
