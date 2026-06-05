
-- 1. Lock down user_roles writes to admins only
CREATE POLICY "admins insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Restrict profiles SELECT to authenticated users only
DROP POLICY IF EXISTS "profiles readable by all" ON public.profiles;
CREATE POLICY "profiles readable by authenticated"
ON public.profiles FOR SELECT TO authenticated
USING (true);

REVOKE SELECT ON public.profiles FROM anon;

-- 3. Switch has_role to SECURITY INVOKER (still correct: users can read their own roles via RLS)
ALTER FUNCTION public.has_role(uuid, public.app_role) SECURITY INVOKER;
