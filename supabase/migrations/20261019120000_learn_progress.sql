-- Progress for the /learn page (public/learn): one row per student per skill
-- or course. Students can only see and change their own rows.
CREATE TABLE public.learn_progress (
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_id    text NOT NULL CHECK (char_length(skill_id) BETWEEN 1 AND 40),
  enrolled    boolean NOT NULL DEFAULT false,
  done        boolean NOT NULL DEFAULT false,
  last_score  integer CHECK (last_score >= 0),
  last_total  integer CHECK (last_total > 0),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id),
  CHECK (last_score IS NULL OR last_total IS NULL OR last_score <= last_total)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.learn_progress TO authenticated;
ALTER TABLE public.learn_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "learn progress: own rows read"   ON public.learn_progress FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "learn progress: own rows insert" ON public.learn_progress FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "learn progress: own rows update" ON public.learn_progress FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "learn progress: own rows delete" ON public.learn_progress FOR DELETE TO authenticated USING (user_id = auth.uid());
