
-- Audit logs table
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  actor_id uuid,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  metadata jsonb
);

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);
CREATE INDEX idx_audit_logs_actor ON public.audit_logs (actor_id);
CREATE INDEX idx_audit_logs_table ON public.audit_logs (table_name);

GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can read
CREATE POLICY "admins read audit logs"
ON public.audit_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow inserts from authenticated context (triggers run as invoker); writes are bounded by triggers
CREATE POLICY "system inserts audit logs"
ON public.audit_logs FOR INSERT TO authenticated
WITH CHECK (true);

-- Generic audit trigger function
CREATE OR REPLACE FUNCTION public.log_audit_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_record_id text;
  v_old jsonb;
  v_new jsonb;
BEGIN
  IF (TG_OP = 'DELETE') THEN
    v_old := to_jsonb(OLD);
    v_record_id := COALESCE((v_old->>'id'), (v_old->>'user_id'));
  ELSIF (TG_OP = 'UPDATE') THEN
    v_old := to_jsonb(OLD);
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE((v_new->>'id'), (v_new->>'user_id'));
  ELSE
    v_new := to_jsonb(NEW);
    v_record_id := COALESCE((v_new->>'id'), (v_new->>'user_id'));
  END IF;

  INSERT INTO public.audit_logs (actor_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), TG_OP, TG_TABLE_NAME, v_record_id, v_old, v_new);

  IF (TG_OP = 'DELETE') THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$;

-- Triggers on sensitive tables
CREATE TRIGGER audit_user_roles
AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_scholarships
AFTER INSERT OR UPDATE OR DELETE ON public.scholarships
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();

CREATE TRIGGER audit_resources
AFTER INSERT OR UPDATE OR DELETE ON public.resources
FOR EACH ROW EXECUTE FUNCTION public.log_audit_event();
