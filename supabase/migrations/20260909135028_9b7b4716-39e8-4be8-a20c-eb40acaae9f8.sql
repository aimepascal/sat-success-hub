ALTER TABLE public.forum_posts
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS file_url text,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_type text,
  ADD COLUMN IF NOT EXISTS file_size bigint;

ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_file_url_domain
  CHECK (file_url IS NULL OR file_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/%');

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_file_url_domain
  CHECK (file_url IS NULL OR file_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/%');

CREATE POLICY "forum files read"
ON storage.objects FOR SELECT
USING (bucket_id = 'forum-files');

CREATE POLICY "users upload own forum files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'forum-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "users delete own forum files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'forum-files' AND auth.uid()::text = (storage.foldername(name))[1]);