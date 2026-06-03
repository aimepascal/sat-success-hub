
ALTER TABLE public.forum_posts ADD CONSTRAINT forum_posts_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.forum_replies ADD CONSTRAINT forum_replies_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
ALTER TABLE public.resource_comments ADD CONSTRAINT resource_comments_profile_fk FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
