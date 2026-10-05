-- Imboni build brief: daily AI limit per student, and the first ten skills.
-- Run after 20261005120100_imboni_learning_core.sql.

-- ---------------------------------------------------------------------------
-- 1. AI usage: one row per student per day
-- ---------------------------------------------------------------------------

CREATE TABLE public.ai_usage (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day date NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);

GRANT SELECT ON public.ai_usage TO authenticated;
GRANT ALL ON public.ai_usage TO service_role;

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "students read their own AI usage"
  ON public.ai_usage FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Counts one AI request for the caller and returns false once today's limit
-- is used up. The limit lives here, not in the app, so it cannot be raised
-- from the browser. A day runs midnight to midnight in Kigali.
CREATE OR REPLACE FUNCTION public.consume_ai_use()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _daily_limit CONSTANT integer := 20;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  INSERT INTO public.ai_usage (user_id, day, count)
  VALUES (auth.uid(), (now() AT TIME ZONE 'Africa/Kigali')::date, 1)
  ON CONFLICT (user_id, day)
  DO UPDATE SET count = public.ai_usage.count + 1
  WHERE public.ai_usage.count < _daily_limit;

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_ai_use() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.consume_ai_use() TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Starting domains and skills
-- ---------------------------------------------------------------------------

-- Weights are each domain's approximate share of its SAT section. Kinyarwanda
-- skill names are left empty until a reviewer supplies them.
INSERT INTO public.domains (name, exam_weight) VALUES
  ('Algebra', 0.35),
  ('Advanced Math', 0.35),
  ('Problem-Solving and Data Analysis', 0.15),
  ('Geometry and Trigonometry', 0.15),
  ('Information and Ideas', 0.26),
  ('Craft and Structure', 0.28),
  ('Expression of Ideas', 0.20),
  ('Standard English Conventions', 0.26)
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.skills (domain_id, name_en)
SELECT d.id, s.name_en
FROM (VALUES
  ('Algebra', 'Linear equations'),
  ('Algebra', 'Systems of equations'),
  ('Advanced Math', 'Quadratics'),
  ('Problem-Solving and Data Analysis', 'Ratios and percentages'),
  ('Geometry and Trigonometry', 'Area and angles'),
  ('Information and Ideas', 'Command of evidence'),
  ('Information and Ideas', 'Central ideas and inferences'),
  ('Craft and Structure', 'Words in context'),
  ('Expression of Ideas', 'Transitions'),
  ('Standard English Conventions', 'Punctuation and sentence boundaries')
) AS s(domain_name, name_en)
JOIN public.domains d ON d.name = s.domain_name
WHERE NOT EXISTS (SELECT 1 FROM public.skills k WHERE k.name_en = s.name_en);
