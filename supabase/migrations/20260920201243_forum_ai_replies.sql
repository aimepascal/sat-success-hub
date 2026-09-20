-- Marks a forum reply as AI-generated so the UI can show it as "AI Tutor"
-- instead of the posting student's own name/avatar.
ALTER TABLE public.forum_replies
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT false;
