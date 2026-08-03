CREATE POLICY "auth manage pop-sources"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'pop-sources')
WITH CHECK (bucket_id = 'pop-sources');