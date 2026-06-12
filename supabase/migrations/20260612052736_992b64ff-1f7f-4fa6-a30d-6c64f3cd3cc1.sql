
-- 1. Create private profile table
CREATE TABLE public.profile_private (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  target_score integer,
  school text,
  score_improvement integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profile_private TO authenticated;
GRANT ALL ON public.profile_private TO service_role;

ALTER TABLE public.profile_private ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can read own private profile"
  ON public.profile_private FOR SELECT TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Owner can insert own private profile"
  ON public.profile_private FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner can update own private profile"
  ON public.profile_private FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Owner can delete own private profile"
  ON public.profile_private FOR DELETE TO authenticated
  USING (auth.uid() = id);

-- 2. Migrate existing data
INSERT INTO public.profile_private (id, target_score, school, score_improvement)
SELECT id, target_score, school, score_improvement
FROM public.profiles
ON CONFLICT (id) DO NOTHING;

-- 3. Drop sensitive columns from public.profiles
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS target_score,
  DROP COLUMN IF EXISTS school,
  DROP COLUMN IF EXISTS score_improvement;

-- 4. Aggregate-only function for the Impact page (no row-level data leaks)
CREATE OR REPLACE FUNCTION public.get_avg_score_improvement()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    ROUND(AVG(score_improvement))::int,
    120
  )
  FROM public.profile_private
  WHERE score_improvement IS NOT NULL AND score_improvement > 0;
$$;

GRANT EXECUTE ON FUNCTION public.get_avg_score_improvement() TO anon, authenticated;
