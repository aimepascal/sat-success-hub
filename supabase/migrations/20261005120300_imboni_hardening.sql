-- Imboni hardening, from the review of the first three migrations.
-- Run after 20261005120200_imboni_ai_usage_and_skills.sql. Safe to run twice.
--
-- 1. submit_attempts now writes a mastery_history row for every attempt, so the
--    "52% to 78%" progress chart has data.
-- 2. Attempt times from a phone cannot be older than 14 days.
-- 3. Draft questions never count: they were never shown to a student. (Unchanged
--    rule, kept explicit.)
-- 4. practice_questions() gives the app questions WITHOUT the answer key. The app
--    should switch to it, and then a later migration can stop students reading the
--    questions table directly (see the note at the bottom).

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
    -- A phone may hold a study pack for a few days, so allow up to 14 days back, no more.
    _at := greatest(
      least(coalesce((_item->>'created_at')::timestamptz, now()), now()),
      now() - interval '14 days'
    );
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

    -- One history row per attempt, so progress over time can be charted.
    INSERT INTO public.mastery_history (user_id, skill_id, mastery, attempts, recorded_at)
    VALUES (_uid, _question.skill_id, _mastery, _state.attempts + 1, clock_timestamp())
    ON CONFLICT DO NOTHING;

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

-- ---------------------------------------------------------------------------
-- Questions without the answer key
-- ---------------------------------------------------------------------------

-- Returns approved questions for the given ids with every option's is_correct and
-- misconception_id removed. Whether an answer is right is decided in submit_attempts.
CREATE OR REPLACE FUNCTION public.practice_questions(_ids uuid[])
RETURNS TABLE (id uuid, skill_id uuid, difficulty text, stem text, options jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id, q.skill_id, q.difficulty, q.stem,
         (SELECT jsonb_agg(jsonb_build_object('text', o.value->>'text') ORDER BY o.ord)
          FROM jsonb_array_elements(q.options) WITH ORDINALITY AS o(value, ord))
  FROM public.questions q
  WHERE q.id = ANY(_ids) AND q.status = 'approved' AND auth.uid() IS NOT NULL
$$;

REVOKE ALL ON FUNCTION public.practice_questions(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.practice_questions(uuid[]) TO authenticated;

-- Returns the correct option and the reviewed explanation for questions the caller
-- has already answered, so the answer is shown only after an attempt exists.
CREATE OR REPLACE FUNCTION public.reveal_answers(_ids uuid[])
RETURNS TABLE (id uuid, correct_index integer, explanation_en text, explanation_rw text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT q.id,
         (SELECT (o.ord - 1)::integer
          FROM jsonb_array_elements(q.options) WITH ORDINALITY AS o(value, ord)
          WHERE (o.value->>'is_correct')::boolean LIMIT 1),
         q.explanation_en, q.explanation_rw
  FROM public.questions q
  WHERE q.id = ANY(_ids)
    AND EXISTS (
      SELECT 1 FROM public.attempts a WHERE a.question_id = q.id AND a.user_id = auth.uid()
    )
$$;

REVOKE ALL ON FUNCTION public.reveal_answers(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reveal_answers(uuid[]) TO authenticated;

-- ---------------------------------------------------------------------------
-- NOT done here on purpose
-- ---------------------------------------------------------------------------
-- The policy "approved questions readable by signed-in users" still lets a student
-- read the answer key straight from the questions table. Do not drop it until
-- /practice and /today use practice_questions() and reveal_answers(), or those
-- screens will show no questions. After that change, replace the policy with:
--   DROP POLICY "approved questions readable by signed-in users" ON public.questions;
--   CREATE POLICY "question staff read questions" ON public.questions
--     FOR SELECT TO authenticated USING (public.is_question_staff());
