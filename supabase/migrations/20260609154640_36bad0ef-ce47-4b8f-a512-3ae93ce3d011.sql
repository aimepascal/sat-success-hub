ALTER TABLE public.forum_replies
  ADD COLUMN image_url text;

ALTER TABLE public.forum_replies
  ADD CONSTRAINT forum_replies_image_url_domain
  CHECK (
    image_url IS NULL
    OR image_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/%'
  );