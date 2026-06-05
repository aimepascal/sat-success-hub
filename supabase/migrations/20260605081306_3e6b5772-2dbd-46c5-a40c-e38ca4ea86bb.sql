
-- Drop overly permissive insert policy; rely on SECURITY DEFINER trigger to write
DROP POLICY IF EXISTS "system inserts audit logs" ON public.audit_logs;

-- Lock down trigger function execution
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.log_audit_event() FROM anon, authenticated;
