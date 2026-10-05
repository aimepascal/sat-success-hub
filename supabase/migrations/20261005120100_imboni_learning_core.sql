-- Imboni build brief, M0 to M2: cohorts with join codes, the reviewed question
-- bank, attempts, mastery per skill, the review queue and daily plans.
-- Run 20261005120000_imboni_roles.sql first.
--
-- The mastery and review-queue rules in submit_attempts() mirror
-- src/lib/learning/engine.ts. Change both together.

-- ---------------------------------------------------------------------------
-- 1. Profiles: interface language
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en'
  CHECK (language IN ('en', 'rw', 'fr'));

-- ---------------------------------------------------------------------------
-- 2. Orgs, cohorts and membership
-- ---------------------------------------------------------------------------

CREATE TABLE public.orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES public.orgs(id) ON DELETE CASCADE,
  name text NOT NULL,
  teacher_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  join_code text NOT NULL UNIQUE CHECK (join_code = upper(join_code) AND length(join_code) >= 6),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.cohort_members (
  cohort_id uuid NOT NULL REFERENCES public.cohorts(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cohort_id, student_id)
);
CREATE INDEX cohort_members_student_idx ON public.cohort_members (student_id);

-- Helpers are SECURITY DEFINER so policies on cohorts and cohort_members can
-- refer to each other without recursive RLS.
CREATE OR REPLACE FUNCTION public.is_cohort_member(_cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohort_members
    WHERE cohort_id = _cohort_id AND student_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_cohort_teacher(_cohort_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cohorts
    WHERE id = _cohort_id AND teacher_id = auth.uid()
  )
$$;

-- True when the caller teaches a cohort the student belongs to.
CREATE OR REPLACE FUNCTION public.teaches_student(_student_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.cohort_members m
    JOIN public.cohorts c ON c.id = m.cohort_id
    WHERE m.student_id = _student_id AND c.teacher_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_question_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'reviewer') OR public.has_role(auth.uid(), 'admin')
$$;

GRANT SELECT ON public.orgs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
GRANT SELECT, DELETE ON public.cohort_members TO authenticated;
GRANT ALL ON public.orgs, public.cohorts, public.cohort_members TO service_role;

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "orgs readable by signed-in users"
  ON public.orgs FOR SELECT TO authenticated USING (true);

CREATE POLICY "cohorts readable by their teacher, members and admins"
  ON public.cohorts FOR SELECT TO authenticated
  USING (
    teacher_id = auth.uid()
    OR public.is_cohort_member(id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "teachers create their own cohorts"
  ON public.cohorts FOR INSERT TO authenticated
  WITH CHECK (
    teacher_id = auth.uid()
    AND (public.has_role(auth.uid(), 'teacher') OR public.has_role(auth.uid(), 'admin'))
  );

CREATE POLICY "teachers update their own cohorts"
  ON public.cohorts FOR UPDATE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "teachers delete their own cohorts"
  ON public.cohorts FOR DELETE TO authenticated
  USING (teacher_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Students join through join_cohort() only, so there is no INSERT policy.
CREATE POLICY "membership readable by the student, the teacher and admins"
  ON public.cohort_members FOR SELECT TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_cohort_teacher(cohort_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "students leave, teachers remove"
  ON public.cohort_members FOR DELETE TO authenticated
  USING (
    student_id = auth.uid()
    OR public.is_cohort_teacher(cohort_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE OR REPLACE FUNCTION public.join_cohort(_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cohort_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;

  SELECT id INTO _cohort_id FROM public.cohorts WHERE join_code = upper(trim(_code));
  IF _cohort_id IS NULL THEN
    RAISE EXCEPTION 'Join code not found';
  END IF;

  INSERT INTO public.cohort_members (cohort_id, student_id)
  VALUES (_cohort_id, auth.uid())
  ON CONFLICT DO NOTHING;

  RETURN _cohort_id;
END;
$$;

REVOKE ALL ON FUNCTION public.join_cohort(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_cohort(text) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Question bank
-- ---------------------------------------------------------------------------

CREATE TABLE public.domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  -- Relative weight of the domain on the exam; the daily plan leans toward heavier domains.
  exam_weight numeric NOT NULL DEFAULT 1 CHECK (exam_weight > 0)
);

CREATE TABLE public.skills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id uuid NOT NULL REFERENCES public.domains(id) ON DELETE CASCADE,
  name_en text NOT NULL,
  name_rw text,
  name_fr text
);

CREATE TABLE public.misconceptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  label_en text NOT NULL,
  label_rw text
);

CREATE TABLE public.questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_id uuid NOT NULL REFERENCES public.skills(id),
  difficulty text NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
  stem text NOT NULL,
  -- [{ "text": "...", "is_correct": true|false, "misconception_id": uuid|null }]
  options jsonb NOT NULL
    CHECK (jsonb_typeof(options) = 'array' AND jsonb_array_length(options) BETWEEN 2 AND 6),
  explanation_en text NOT NULL,
  explanation_rw text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'in_review', 'approved', 'retired')),
  version integer NOT NULL DEFAULT 1,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX questions_skill_status_idx ON public.questions (skill_id, status);

CREATE TABLE public.question_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  reviewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  decision text NOT NULL CHECK (decision IN ('approved', 'sent_back', 'retired')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Keeps the approval trail honest: exactly one correct option, approval is
-- stamped with the reviewer, and editing an approved question sends it back
-- to review.
CREATE OR REPLACE FUNCTION public.questions_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF (
    SELECT count(*) FROM jsonb_array_elements(NEW.options) o
    WHERE (o->>'is_correct')::boolean
  ) <> 1 THEN
    RAISE EXCEPTION 'A question needs exactly one correct option';
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.status = 'approved' AND NEW.status = 'approved'
     AND (NEW.stem, NEW.options, NEW.explanation_en, NEW.explanation_rw, NEW.skill_id, NEW.difficulty)
         IS DISTINCT FROM
         (OLD.stem, OLD.options, OLD.explanation_en, OLD.explanation_rw, OLD.skill_id, OLD.difficulty)
  THEN
    NEW.status := 'in_review';
    NEW.version := OLD.version + 1;
    NEW.reviewed_by := NULL;
    NEW.reviewed_at := NULL;
  ELSIF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status <> 'approved') THEN
    NEW.reviewed_by := auth.uid();
    NEW.reviewed_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER questions_guard
  BEFORE INSERT OR UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.questions_guard();

GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.domains, public.skills, public.misconceptions, public.questions, public.question_reviews
  TO authenticated;
GRANT ALL
  ON public.domains, public.skills, public.misconceptions, public.questions, public.question_reviews
  TO service_role;

ALTER TABLE public.domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.misconceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "domains readable by signed-in users"
  ON public.domains FOR SELECT TO authenticated USING (true);
CREATE POLICY "question staff manage domains"
  ON public.domains FOR ALL TO authenticated
  USING (public.is_question_staff()) WITH CHECK (public.is_question_staff());

CREATE POLICY "skills readable by signed-in users"
  ON public.skills FOR SELECT TO authenticated USING (true);
CREATE POLICY "question staff manage skills"
  ON public.skills FOR ALL TO authenticated
  USING (public.is_question_staff()) WITH CHECK (public.is_question_staff());

CREATE POLICY "misconceptions readable by signed-in users"
  ON public.misconceptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "question staff manage misconceptions"
  ON public.misconceptions FOR ALL TO authenticated
  USING (public.is_question_staff()) WITH CHECK (public.is_question_staff());

-- The rule the brief calls non-negotiable: students only ever see approved questions.
CREATE POLICY "approved questions readable by signed-in users"
  ON public.questions FOR SELECT TO authenticated
  USING (status = 'approved' OR public.is_question_staff());
CREATE POLICY "question staff insert questions"
  ON public.questions FOR INSERT TO authenticated
  WITH CHECK (public.is_question_staff());
CREATE POLICY "question staff update questions"
  ON public.questions FOR UPDATE TO authenticated
  USING (public.is_question_staff()) WITH CHECK (public.is_question_staff());
CREATE POLICY "question staff delete questions"
  ON public.questions FOR DELETE TO authenticated
  USING (public.is_question_staff());

CREATE POLICY "question staff manage reviews"
  ON public.question_reviews FOR ALL TO authenticated
  USING (public.is_question_staff()) WITH CHECK (public.is_question_staff());

-- ---------------------------------------------------------------------------
-- 4. Attempts, mastery, review queue, daily plans
-- ---------------------------------------------------------------------------

CREATE TABLE public.attempts (
  -- Generated on the phone, so a repeated sync is counted once.
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id),
  option_index integer NOT NULL,
  correct boolean NOT NULL,
  time_ms integer,
  mode text NOT NULL CHECK (mode IN ('diagnostic', 'practice', 'review', 'assignment')),
  created_at timestamptz NOT NULL,
  synced_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX attempts_user_created_idx ON public.attempts (user_id, created_at DESC);

CREATE TABLE public.skill_mastery (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  mastery numeric NOT NULL DEFAULT 0 CHECK (mastery BETWEEN 0 AND 1),
  attempts integer NOT NULL DEFAULT 0,
  miss_streak integer NOT NULL DEFAULT 0,
  baseline_mastery numeric,
  baseline_set_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE public.mastery_history (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  skill_id uuid NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  mastery numeric NOT NULL,
  attempts integer NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_id, recorded_at)
);

CREATE TABLE public.review_queue (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  box integer NOT NULL CHECK (box BETWEEN 1 AND 4),
  due_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, question_id)
);
CREATE INDEX review_queue_due_idx ON public.review_queue (user_id, due_at);

CREATE TABLE public.daily_plans (
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_date date NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_count integer NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, plan_date)
);

-- Students get read access only on attempts, mastery and the queue: every
-- write goes through submit_attempts(), so mastery cannot be edited by hand.
GRANT SELECT
  ON public.attempts, public.skill_mastery, public.mastery_history, public.review_queue
  TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.daily_plans TO authenticated;
GRANT ALL
  ON public.attempts, public.skill_mastery, public.mastery_history, public.review_queue,
     public.daily_plans
  TO service_role;

ALTER TABLE public.attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mastery_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "attempts readable by the student, their teacher and admins"
  ON public.attempts FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.teaches_student(user_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "mastery readable by the student, their teacher and admins"
  ON public.skill_mastery FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.teaches_student(user_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "mastery history readable by the student, their teacher and admins"
  ON public.mastery_history FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.teaches_student(user_id)
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "students read their own review queue"
  ON public.review_queue FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "plans readable by the student, their teacher and admins"
  ON public.daily_plans FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.teaches_student(user_id)
    OR public.has_role(auth.uid(), 'admin')
  );
CREATE POLICY "students create their own plans"
  ON public.daily_plans FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "students update their own plans"
  ON public.daily_plans FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. submit_attempts: validate, de-duplicate, save, update mastery and queue
-- ---------------------------------------------------------------------------

-- _batch is a JSON array of
--   { "id": uuid, "question_id": uuid, "option_index": int, "time_ms": int,
--     "mode": text, "created_at": timestamptz }
-- Whether an answer is correct is decided here from the question, never taken
-- from the phone. Returns the number of new attempts saved.
CREATE OR REPLACE FUNCTION public.submit_attempts(_batch jsonb)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _baseline_attempts CONSTANT integer := 8;
  _review_delays CONSTANT integer[] := ARRAY[1, 3, 7, 14];
  _uid uuid := auth.uid();
  _item jsonb;
  _question record;
  _state record;
  _index integer;
  _correct boolean;
  _score numeric;
  _mode text;
  _at timestamptz;
  _mastery numeric;
  _box integer;
  _saved integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF jsonb_typeof(_batch) <> 'array' OR jsonb_array_length(_batch) > 200 THEN
    RAISE EXCEPTION 'Expected an array of at most 200 attempts';
  END IF;

  FOR _item IN
    SELECT value FROM jsonb_array_elements(_batch)
    ORDER BY (value->>'created_at')::timestamptz
  LOOP
    -- Drafts were never shown to students. A question retired or sent back to
    -- review since the pack was downloaded still counts.
    SELECT id, skill_id, difficulty, options INTO _question
    FROM public.questions
    WHERE id = (_item->>'question_id')::uuid AND status <> 'draft';
    CONTINUE WHEN NOT FOUND;

    _index := (_item->>'option_index')::integer;
    CONTINUE WHEN _index IS NULL OR _index < 0 OR _index >= jsonb_array_length(_question.options);

    _correct := coalesce((_question.options->_index->>'is_correct')::boolean, false);
    _score := CASE WHEN _correct THEN 1 ELSE 0 END;
    _at := least(coalesce((_item->>'created_at')::timestamptz, now()), now());
    _mode := _item->>'mode';
    IF _mode IS NULL OR _mode NOT IN ('diagnostic', 'practice', 'review', 'assignment') THEN
      _mode := 'practice';
    END IF;

    INSERT INTO public.attempts (id, user_id, question_id, option_index, correct, time_ms, mode, created_at)
    VALUES (
      (_item->>'id')::uuid, _uid, _question.id, _index, _correct,
      (_item->>'time_ms')::integer, _mode, _at
    )
    ON CONFLICT (id) DO NOTHING;
    CONTINUE WHEN NOT FOUND;
    _saved := _saved + 1;

    -- Mastery: share correct up to the baseline, then a weighted update.
    INSERT INTO public.skill_mastery (user_id, skill_id)
    VALUES (_uid, _question.skill_id)
    ON CONFLICT DO NOTHING;

    SELECT mastery, attempts, miss_streak INTO _state
    FROM public.skill_mastery
    WHERE user_id = _uid AND skill_id = _question.skill_id
    FOR UPDATE;

    IF _state.attempts < _baseline_attempts THEN
      _mastery := (_state.mastery * _state.attempts + _score) / (_state.attempts + 1);
    ELSE
      _mastery := _state.mastery
        + CASE _question.difficulty WHEN 'easy' THEN 0.16 WHEN 'hard' THEN 0.24 ELSE 0.2 END
          * (_score - _state.mastery);
    END IF;

    UPDATE public.skill_mastery
    SET mastery = _mastery,
        attempts = _state.attempts + 1,
        miss_streak = CASE WHEN _correct THEN 0 ELSE _state.miss_streak + 1 END,
        baseline_mastery =
          CASE WHEN _state.attempts + 1 = _baseline_attempts THEN _mastery ELSE baseline_mastery END,
        baseline_set_at =
          CASE WHEN _state.attempts + 1 = _baseline_attempts THEN _at ELSE baseline_set_at END,
        updated_at = now()
    WHERE user_id = _uid AND skill_id = _question.skill_id;

    -- Review queue: a miss goes to box 1, a correct review moves up a box and
    -- leaves the queue after the last one.
    IF NOT _correct THEN
      INSERT INTO public.review_queue (user_id, question_id, box, due_at)
      VALUES (_uid, _question.id, 1, _at + make_interval(days => _review_delays[1]))
      ON CONFLICT (user_id, question_id)
      DO UPDATE SET box = 1, due_at = EXCLUDED.due_at;
    ELSE
      SELECT box INTO _box FROM public.review_queue
      WHERE user_id = _uid AND question_id = _question.id;
      IF FOUND THEN
        IF _box >= array_length(_review_delays, 1) THEN
          DELETE FROM public.review_queue
          WHERE user_id = _uid AND question_id = _question.id;
        ELSE
          UPDATE public.review_queue
          SET box = _box + 1,
              due_at = _at + make_interval(days => _review_delays[_box + 1])
          WHERE user_id = _uid AND question_id = _question.id;
        END IF;
      END IF;
    END IF;
  END LOOP;

  RETURN _saved;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_attempts(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_attempts(jsonb) TO authenticated;
