CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_superadmin = true
  )
$$;

REVOKE ALL ON FUNCTION private.is_superadmin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  kind text NOT NULL DEFAULT 'melhoria',
  priority text NOT NULL DEFAULT 'media',
  status text NOT NULL DEFAULT 'aberto',
  response text NOT NULL DEFAULT '',
  created_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tickets TO authenticated;
GRANT ALL ON public.tickets TO service_role;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tickets_own" ON public.tickets;
CREATE POLICY "tickets_own" ON public.tickets
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

DROP POLICY IF EXISTS "tickets_superadmin" ON public.tickets;
CREATE POLICY "tickets_superadmin" ON public.tickets
  FOR ALL TO authenticated
  USING (private.is_superadmin())
  WITH CHECK (private.is_superadmin());

DROP TRIGGER IF EXISTS tickets_updated_at ON public.tickets;
CREATE TRIGGER tickets_updated_at BEFORE UPDATE ON public.tickets
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.crm_leads ADD COLUMN IF NOT EXISTS payment_due_date date;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT c.relname AS tbl
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relrowsecurity = true
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'superadmin_full_access', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (private.is_superadmin()) WITH CHECK (private.is_superadmin())',
      'superadmin_full_access', r.tbl);
  END LOOP;
END $$;