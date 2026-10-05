// Types and a typed client for the Imboni learning tables.
//
// src/integrations/supabase/types.ts is generated from the live database and
// does not know these tables until the migrations in supabase/migrations
// (20261005120000 onward) have been applied and the types regenerated. Until
// then this file describes them by hand. Once the generated types include
// them, delete LearningDatabase and use the normal `supabase` client.

import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Difficulty, PlanItem } from "./engine";

export type QuestionStatus = "draft" | "in_review" | "approved" | "retired";
export type AttemptMode = "diagnostic" | "practice" | "review" | "assignment";
export type AppRole = "admin" | "moderator" | "user" | "teacher" | "reviewer";

export type QuestionOption = {
  text: string;
  is_correct: boolean;
  misconception_id: string | null;
};

export type Cohort = {
  id: string;
  org_id: string | null;
  name: string;
  teacher_id: string;
  join_code: string;
  created_at: string;
};

export type CohortMember = { cohort_id: string; student_id: string; joined_at: string };

export type Domain = { id: string; name: string; exam_weight: number };

export type Skill = {
  id: string;
  domain_id: string;
  name_en: string;
  name_rw: string | null;
  name_fr: string | null;
};

export type Misconception = {
  id: string;
  skill_id: string;
  label_en: string;
  label_rw: string | null;
};

export type Question = {
  id: string;
  skill_id: string;
  difficulty: Difficulty;
  stem: string;
  options: QuestionOption[];
  explanation_en: string;
  explanation_rw: string | null;
  status: QuestionStatus;
  version: number;
  created_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type QuestionReview = {
  id: string;
  question_id: string;
  reviewer_id: string | null;
  decision: "approved" | "sent_back" | "retired";
  notes: string | null;
  created_at: string;
};

export type Attempt = {
  id: string;
  user_id: string;
  question_id: string;
  option_index: number;
  correct: boolean;
  time_ms: number | null;
  mode: AttemptMode;
  created_at: string;
  synced_at: string;
};

export type SkillMasteryRow = {
  user_id: string;
  skill_id: string;
  mastery: number;
  attempts: number;
  miss_streak: number;
  baseline_mastery: number | null;
  baseline_set_at: string | null;
  updated_at: string;
};

export type ReviewQueueRow = { user_id: string; question_id: string; box: number; due_at: string };

export type DailyPlan = {
  user_id: string;
  plan_date: string;
  items: PlanItem[];
  completed_count: number;
};

/** One attempt as sent to submit_attempts(). The server decides whether it was correct. */
export type AttemptInput = {
  id: string;
  question_id: string;
  option_index: number;
  time_ms: number;
  mode: AttemptMode;
  created_at: string;
};

type Table<Row, Insert = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Row>;
  Relationships: [];
};

type Required_<T, K extends keyof T> = Partial<T> & Pick<T, K>;

export type LearningDatabase = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      profiles: Table<{ id: string; display_name: string; language: string }>;
      user_roles: Table<{ user_id: string; role: AppRole }>;
      cohorts: Table<Cohort, Required_<Cohort, "name" | "teacher_id" | "join_code">>;
      cohort_members: Table<CohortMember>;
      domains: Table<Domain, Required_<Domain, "name">>;
      skills: Table<Skill, Required_<Skill, "domain_id" | "name_en">>;
      misconceptions: Table<Misconception, Required_<Misconception, "skill_id" | "label_en">>;
      questions: Table<
        Question,
        Required_<Question, "skill_id" | "difficulty" | "stem" | "options" | "explanation_en">
      >;
      question_reviews: Table<
        QuestionReview,
        Required_<QuestionReview, "question_id" | "decision">
      >;
      attempts: Table<Attempt>;
      skill_mastery: Table<SkillMasteryRow>;
      review_queue: Table<ReviewQueueRow>;
      daily_plans: Table<DailyPlan, Required_<DailyPlan, "user_id" | "plan_date">>;
    };
    Views: { [_ in never]: never };
    Functions: {
      join_cohort: { Args: { _code: string }; Returns: string };
      submit_attempts: { Args: { _batch: AttemptInput[] }; Returns: number };
      consume_ai_use: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type LearningClient = SupabaseClient<LearningDatabase>;

/** The app's Supabase client, typed for the learning tables. */
export const learningDb = supabase as unknown as LearningClient;

/** Re-types a server-side Supabase client (for example the one from requireSupabaseAuth). */
export function asLearningClient(client: unknown): LearningClient {
  return client as LearningClient;
}
