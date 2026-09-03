-- 1. Team membership check (users provisioned in user_roles)
CREATE OR REPLACE FUNCTION public.is_team_member()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.is_team_member() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team_member() TO authenticated, service_role;

-- 2. Rewrite every permissive public-schema policy to require team membership
DO $$
DECLARE r RECORD;
  using_sql text;
  check_sql text;
BEGIN
  FOR r IN
    SELECT tablename, policyname, cmd
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename <> 'user_roles'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', r.policyname, r.tablename);
    using_sql := '';
    check_sql := '';
    IF r.cmd IN ('ALL','SELECT','UPDATE','DELETE') THEN
      using_sql := ' USING (public.is_team_member())';
    END IF;
    IF r.cmd IN ('ALL','INSERT','UPDATE') THEN
      check_sql := ' WITH CHECK (public.is_team_member())';
    END IF;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR %s TO authenticated%s%s',
      r.policyname, r.tablename,
      CASE r.cmd WHEN 'ALL' THEN 'ALL' ELSE r.cmd END,
      using_sql, check_sql
    );
  END LOOP;
END $$;

-- 3. Storage buckets: require team membership as well
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND policyname IN (
        'team can read interview audio','team can upload interview audio',
        'team can update interview audio','team can delete interview audio',
        'portal_logos_auth_read','portal_logos_auth_insert',
        'portal_logos_auth_update','portal_logos_auth_delete',
        'auth manage pop-sources')
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', r.policyname);
  END LOOP;
END $$;

CREATE POLICY "team manages interview audio" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'interview-audio' AND public.is_team_member())
  WITH CHECK (bucket_id = 'interview-audio' AND public.is_team_member());

CREATE POLICY "team manages portal logos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'portal-logos' AND public.is_team_member())
  WITH CHECK (bucket_id = 'portal-logos' AND public.is_team_member());

CREATE POLICY "team manages pop sources" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'pop-sources' AND public.is_team_member())
  WITH CHECK (bucket_id = 'pop-sources' AND public.is_team_member());

-- 4. Lock down SECURITY DEFINER / trigger functions
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_single_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.log_action_plan_changes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.indicators_autofill() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.evaluate_collection() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.action_plans_autofill() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.companies_autofill_token() FROM PUBLIC, anon, authenticated;

-- 5. View must respect the querying user's permissions
ALTER VIEW public.v_indicator_status SET (security_invoker = true);

-- 6. Ensure existing users keep access (backfill roles for current auth users)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'member'::public.app_role FROM auth.users
ON CONFLICT DO NOTHING;

-- 7. anon should not read app tables
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;