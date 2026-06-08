-- 1) Restrict resource_likes SELECT to authenticated users
DROP POLICY IF EXISTS "likes readable" ON public.resource_likes;
CREATE POLICY "likes readable by authenticated"
  ON public.resource_likes FOR SELECT
  TO authenticated
  USING (true);

-- 2) Remove non-admin insert policy on resources (admin-only inserts)
DROP POLICY IF EXISTS "auth can insert resources" ON public.resources;

-- 3) Harden has_role with SECURITY DEFINER to prevent recursive RLS issues
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;