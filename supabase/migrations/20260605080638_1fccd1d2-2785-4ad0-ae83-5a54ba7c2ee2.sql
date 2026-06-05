
CREATE POLICY "forum images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-images');

CREATE POLICY "users upload own forum images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users update own forum images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own forum images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'forum-images' AND auth.uid()::text = (storage.foldername(name))[1]);
