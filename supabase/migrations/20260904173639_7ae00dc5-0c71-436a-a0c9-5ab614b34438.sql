-- ============ FASE 2: perfis, vínculos, acessos, auditoria ============

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id uuid PRIMARY KEY,
  email text,
  full_name text NOT NULL DEFAULT '',
  is_superadmin boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.company_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  member_role text NOT NULL DEFAULT 'consultor',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_members TO authenticated;
GRANT ALL ON public.company_members TO service_role;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.access_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  full_name text NOT NULL DEFAULT '',
  requested_company text NOT NULL DEFAULT '',
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.access_requests TO authenticated;
GRANT ALL ON public.access_requests TO service_role;
ALTER TABLE public.access_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  company_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER company_members_updated_at BEFORE UPDATE ON public.company_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER access_requests_updated_at BEFORE UPDATE ON public.access_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Funções de permissão (schema privado) ============

CREATE OR REPLACE FUNCTION private.is_superadmin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_superadmin)
$$;

CREATE OR REPLACE FUNCTION private.has_company_access(_company_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _company_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_superadmin)
    OR EXISTS (
      SELECT 1 FROM public.company_members m
      JOIN public.profiles p ON p.user_id = m.user_id
      WHERE m.user_id = auth.uid() AND m.company_id = _company_id AND p.status = 'active'
    )
  )
$$;

CREATE OR REPLACE FUNCTION private.has_tool(_company_id uuid, _tool text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_superadmin)
  OR EXISTS (
    SELECT 1 FROM public.company_members m
    JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.user_id = auth.uid() AND m.company_id = _company_id
      AND p.status = 'active'
      AND COALESCE((m.permissions ->> _tool)::boolean, false)
  )
$$;

REVOKE ALL ON FUNCTION private.is_superadmin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_company_access(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.has_tool(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_superadmin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_company_access(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_tool(uuid, text) TO authenticated, service_role;

-- ============ Políticas das novas tabelas ============

CREATE POLICY "profiles_self_or_admin_select" ON public.profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin());
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND NOT is_superadmin) WITH CHECK (user_id = auth.uid() AND NOT is_superadmin);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL TO authenticated
  USING (private.is_superadmin()) WITH CHECK (private.is_superadmin());

CREATE POLICY "company_members_read" ON public.company_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin());
CREATE POLICY "company_members_admin_all" ON public.company_members FOR ALL TO authenticated
  USING (private.is_superadmin()) WITH CHECK (private.is_superadmin());

CREATE POLICY "access_requests_own_insert" ON public.access_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "access_requests_read" ON public.access_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_superadmin());
CREATE POLICY "access_requests_admin_all" ON public.access_requests FOR ALL TO authenticated
  USING (private.is_superadmin()) WITH CHECK (private.is_superadmin());

CREATE POLICY "audit_log_admin_read" ON public.audit_log FOR SELECT TO authenticated
  USING (private.is_superadmin());
CREATE POLICY "audit_log_insert" ON public.audit_log FOR INSERT TO authenticated
  WITH CHECK (actor_id = auth.uid());

-- ============ Cadastro de usuários: pendente em vez de bloqueado ============

CREATE OR REPLACE FUNCTION public.enforce_single_user_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member') ON CONFLICT DO NOTHING;
  INSERT INTO public.profiles (user_id, email, full_name, is_superadmin, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    lower(COALESCE(NEW.email, '')) = 'g_zamboni@hotmail.com',
    CASE WHEN lower(COALESCE(NEW.email, '')) = 'g_zamboni@hotmail.com' THEN 'active' ELSE 'pending' END
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_single_user_signup() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- Backfill de perfis para usuários já existentes
INSERT INTO public.profiles (user_id, email, full_name, is_superadmin, status)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
       lower(COALESCE(u.email, '')) = 'g_zamboni@hotmail.com',
       CASE WHEN lower(COALESCE(u.email, '')) = 'g_zamboni@hotmail.com' THEN 'active' ELSE 'pending' END
FROM auth.users u
ON CONFLICT (user_id) DO NOTHING;

-- ============ FASE 1: horas, despesas e ferramentas ============

ALTER TABLE public.work_hours
  ADD COLUMN IF NOT EXISTS start_time time,
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS billing_status text NOT NULL DEFAULT 'aberto',
  ADD COLUMN IF NOT EXISTS invoiced_at timestamptz,
  ADD COLUMN IF NOT EXISTS invoiced_by uuid,
  ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE TABLE IF NOT EXISTS public.work_hour_expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_hour_id uuid NOT NULL REFERENCES public.work_hours(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hour_expenses TO authenticated;
GRANT ALL ON public.work_hour_expenses TO service_role;
ALTER TABLE public.work_hour_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_hour_expenses_scoped" ON public.work_hour_expenses FOR ALL TO authenticated
  USING (private.is_superadmin() OR private.has_company_access(company_id))
  WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id));
CREATE TRIGGER work_hour_expenses_updated_at BEFORE UPDATE ON public.work_hour_expenses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.work_hour_tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_hour_id uuid NOT NULL REFERENCES public.work_hours(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  quantity numeric NOT NULL DEFAULT 1,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hour_tools TO authenticated;
GRANT ALL ON public.work_hour_tools TO service_role;
ALTER TABLE public.work_hour_tools ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_hour_tools_scoped" ON public.work_hour_tools FOR ALL TO authenticated
  USING (private.is_superadmin() OR private.has_company_access(company_id))
  WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id));
CREATE TRIGGER work_hour_tools_updated_at BEFORE UPDATE ON public.work_hour_tools
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Trava de faturamento: bloqueia edição/exclusão de lançamentos já faturados
CREATE OR REPLACE FUNCTION public.work_hours_billing_lock()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.billing_status = 'faturado' THEN
      RAISE EXCEPTION 'Lançamento já faturado não pode ser excluído';
    END IF;
    RETURN OLD;
  END IF;
  IF OLD.billing_status = 'faturado' AND NEW.billing_status = 'faturado' THEN
    IF NEW.hours IS DISTINCT FROM OLD.hours
       OR NEW.work_date IS DISTINCT FROM OLD.work_date
       OR NEW.start_time IS DISTINCT FROM OLD.start_time
       OR NEW.end_time IS DISTINCT FROM OLD.end_time
       OR NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.company_id IS DISTINCT FROM OLD.company_id THEN
      RAISE EXCEPTION 'Lançamento já faturado não pode ser alterado';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.work_hours_billing_lock() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_work_hours_billing_lock BEFORE UPDATE OR DELETE ON public.work_hours
  FOR EACH ROW EXECUTE FUNCTION public.work_hours_billing_lock();

-- ============ Isolamento por empresa nas tabelas existentes ============

DO $$
DECLARE
  t text;
  p record;
  tables text[] := ARRAY[
    'action_plans','calendar_events','cronoanalysis_sessions','document_templates',
    'executive_diagnostics','improvement_opportunities','indicators','interviews',
    'pain_points','pops','prioritization_criteria','processes','projects',
    'roadmap_items','root_cause_analyses','sectors','work_hours'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = t LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p.policyname, t);
    END LOOP;
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I FOR ALL TO authenticated
      USING (private.is_superadmin() OR private.has_company_access(company_id))
      WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id))
    $f$, t || '_company_scoped', t);
  END LOOP;

  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'companies' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.companies', p.policyname);
  END LOOP;
  EXECUTE $f$
    CREATE POLICY companies_scoped ON public.companies FOR ALL TO authenticated
    USING (private.is_superadmin() OR private.has_company_access(id))
    WITH CHECK (private.is_superadmin())
  $f$;
END $$;
