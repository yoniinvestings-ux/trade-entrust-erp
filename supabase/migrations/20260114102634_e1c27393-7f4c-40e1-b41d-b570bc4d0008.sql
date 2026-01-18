-- Make system bucket public for logo access
UPDATE storage.buckets SET public = true WHERE id = 'system';

-- Create RLS policies for system bucket
CREATE POLICY "Authenticated users can upload to system bucket"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'system');

CREATE POLICY "Authenticated users can update system bucket files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'system');

CREATE POLICY "Anyone can view system bucket files"
ON storage.objects FOR SELECT
USING (bucket_id = 'system');