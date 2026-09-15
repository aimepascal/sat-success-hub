ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_name text,
  ADD COLUMN IF NOT EXISTS video_type text,
  ADD COLUMN IF NOT EXISTS video_size bigint;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS video_url text,
  ADD COLUMN IF NOT EXISTS video_name text,
  ADD COLUMN IF NOT EXISTS video_type text,
  ADD COLUMN IF NOT EXISTS video_size bigint;

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_video_url_domain
  CHECK (video_url IS NULL OR video_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/v1/%');

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_video_url_domain
  CHECK (video_url IS NULL OR video_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/v1/%');

CREATE POLICY "authenticated uploads own forum videos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'forum-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "forum videos readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'forum-videos');

CREATE POLICY "owner deletes own forum videos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'forum-videos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "owner updates own forum videos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'forum-videos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'forum-videos' AND (storage.foldername(name))[1] = auth.uid()::text);