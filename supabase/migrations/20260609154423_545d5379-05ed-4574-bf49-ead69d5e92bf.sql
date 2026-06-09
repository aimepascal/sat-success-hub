ALTER TABLE public.forum_posts
  ADD CONSTRAINT forum_posts_image_url_domain
  CHECK (
    image_url IS NULL
    OR image_url LIKE 'https://jivhkutqmlmaqpqoopiv.supabase.co/storage/%'
  );