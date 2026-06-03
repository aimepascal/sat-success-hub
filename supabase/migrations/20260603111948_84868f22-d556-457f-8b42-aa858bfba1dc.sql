
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  school TEXT,
  target_score INTEGER,
  score_improvement INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT SELECT ON public.profiles TO anon;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Resources (Cheat Code Vault)
CREATE TABLE public.resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  section TEXT NOT NULL DEFAULT 'Reading',
  summary TEXT NOT NULL,
  content TEXT NOT NULL,
  file_url TEXT,
  download_count INTEGER NOT NULL DEFAULT 0,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resources TO authenticated;
GRANT ALL ON public.resources TO service_role;
ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "resources readable by all" ON public.resources FOR SELECT USING (true);
CREATE POLICY "auth can insert resources" ON public.resources FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "author updates resource" ON public.resources FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "author deletes resource" ON public.resources FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Resource likes
CREATE TABLE public.resource_likes (
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (resource_id, user_id)
);
GRANT SELECT ON public.resource_likes TO anon, authenticated;
GRANT INSERT, DELETE ON public.resource_likes TO authenticated;
GRANT ALL ON public.resource_likes TO service_role;
ALTER TABLE public.resource_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "likes readable" ON public.resource_likes FOR SELECT USING (true);
CREATE POLICY "user likes" ON public.resource_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user unlikes" ON public.resource_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Resource comments
CREATE TABLE public.resource_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resource_id UUID NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.resource_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.resource_comments TO authenticated;
GRANT ALL ON public.resource_comments TO service_role;
ALTER TABLE public.resource_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments readable" ON public.resource_comments FOR SELECT USING (true);
CREATE POLICY "user comments" ON public.resource_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "author edits comment" ON public.resource_comments FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "author deletes comment" ON public.resource_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum posts
CREATE TABLE public.forum_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  image_url TEXT,
  topic TEXT NOT NULL DEFAULT 'General',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_posts TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_posts TO authenticated;
GRANT ALL ON public.forum_posts TO service_role;
ALTER TABLE public.forum_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "posts readable" ON public.forum_posts FOR SELECT USING (true);
CREATE POLICY "user creates post" ON public.forum_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "author edits post" ON public.forum_posts FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "author deletes post" ON public.forum_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Forum replies
CREATE TABLE public.forum_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.forum_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.forum_replies TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.forum_replies TO authenticated;
GRANT ALL ON public.forum_replies TO service_role;
ALTER TABLE public.forum_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "replies readable" ON public.forum_replies FOR SELECT USING (true);
CREATE POLICY "user replies" ON public.forum_replies FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "author edits reply" ON public.forum_replies FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "author deletes reply" ON public.forum_replies FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Scholarships
CREATE TABLE public.scholarships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  country TEXT NOT NULL,
  scholarship_type TEXT NOT NULL,
  amount TEXT,
  deadline DATE NOT NULL,
  description TEXT NOT NULL,
  apply_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.scholarships TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.scholarships TO authenticated;
GRANT ALL ON public.scholarships TO service_role;
ALTER TABLE public.scholarships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "scholarships readable" ON public.scholarships FOR SELECT USING (true);
