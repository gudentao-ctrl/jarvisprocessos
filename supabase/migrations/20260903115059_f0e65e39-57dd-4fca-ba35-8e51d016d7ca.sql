CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_team_member()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;
REVOKE ALL ON FUNCTION private.is_team_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_team_member() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Repoint every policy to the private function
DO $$
DECLARE r RECORD; using_sql text; check_sql text;
BEGIN
  FOR r IN SELECT tablename, policyname, cmd FROM pg_policies
           WHERE schemaname = 'public' AND tablename <> 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    using_sql := ''; check_sql := '';
    IF r.cmd IN ('ALL','SELECT','UPDATE','DELETE') THEN using_sql := ' USING (private.is_team_member())'; END IF;
    IF r.cmd IN ('ALL','INSERT','UPDATE') THEN check_sql := ' WITH CHECK (private.is_team_member())'; END IF;
    EXECUTE format('CREATE POLICY %I ON public.%I FOR %s TO authenticated%s%s',
      r.policyname, r.tablename, r.cmd, using_sql, check_sql);
  END LOOP;
END $$;

DROP POLICY IF EXISTS "team manages interview audio" ON storage.objects;
DROP POLICY IF EXISTS "team manages portal logos" ON storage.objects;
DROP POLICY IF EXISTS "team manages pop sources" ON storage.objects;

CREATE POLICY "team manages interview audio" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'interview-audio' AND private.is_team_member())
  WITH CHECK (bucket_id = 'interview-audio' AND private.is_team_member());
CREATE POLICY "team manages portal logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'portal-logos' AND private.is_team_member())
  WITH CHECK (bucket_id = 'portal-logos' AND private.is_team_member());
CREATE POLICY "team manages pop sources" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pop-sources' AND private.is_team_member())
  WITH CHECK (bucket_id = 'pop-sources' AND private.is_team_member());

DROP FUNCTION IF EXISTS public.is_team_member();
DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);