-- Imboni build brief, M0: new roles.
-- Kept in its own migration because Postgres does not allow a new enum value
-- to be used in the same transaction that adds it. Run this file first.

ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teacher';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'reviewer';
