CREATE OR REPLACE FUNCTION private.has_any_tool(_tool text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.is_superadmin
  ) OR EXISTS (
    SELECT 1
    FROM public.company_members m
    JOIN public.profiles p ON p.user_id = m.user_id
    WHERE m.user_id = auth.uid()
      AND p.status = 'active'
      AND COALESCE((m.permissions ->> _tool)::boolean, false)
  )
$$;
REVOKE ALL ON FUNCTION private.has_any_tool(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_any_tool(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "team_read_work_hours" ON public.work_hours;
DROP POLICY IF EXISTS "team_write_work_hours" ON public.work_hours;
DROP POLICY IF EXISTS "team_update_work_hours" ON public.work_hours;
DROP POLICY IF EXISTS "team_delete_work_hours" ON public.work_hours;
CREATE POLICY "work_hours_tool_select" ON public.work_hours FOR SELECT TO authenticated
  USING (private.has_tool(company_id, 'horas'));
CREATE POLICY "work_hours_tool_insert" ON public.work_hours FOR INSERT TO authenticated
  WITH CHECK (private.has_tool(company_id, 'horas') AND (private.is_superadmin() OR user_id = auth.uid()));
CREATE POLICY "work_hours_tool_update" ON public.work_hours FOR UPDATE TO authenticated
  USING (private.has_tool(company_id, 'horas') AND (private.is_superadmin() OR user_id = auth.uid()))
  WITH CHECK (private.has_tool(company_id, 'horas') AND (private.is_superadmin() OR user_id = auth.uid()));
CREATE POLICY "work_hours_tool_delete" ON public.work_hours FOR DELETE TO authenticated
  USING (private.has_tool(company_id, 'horas') AND (private.is_superadmin() OR user_id = auth.uid()));

DROP POLICY IF EXISTS "Authenticated users manage pops" ON public.pops;
CREATE POLICY "pops_tool_access" ON public.pops FOR ALL TO authenticated
  USING (private.has_tool(company_id, 'pop'))
  WITH CHECK (private.has_tool(company_id, 'pop'));

DROP POLICY IF EXISTS "team manages indicators" ON public.indicators;
CREATE POLICY "indicators_tool_access" ON public.indicators FOR ALL TO authenticated
  USING (private.has_tool(company_id, 'indicadores'))
  WITH CHECK (private.has_tool(company_id, 'indicadores'));

DROP POLICY IF EXISTS invoices_company_scoped ON public.invoices;
CREATE POLICY invoices_tool_scoped ON public.invoices FOR ALL TO authenticated
  USING (private.has_tool(company_id, 'financeiro'))
  WITH CHECK (private.has_tool(company_id, 'financeiro'));

DROP POLICY IF EXISTS payments_company_scoped ON public.payments;
CREATE POLICY payments_tool_scoped ON public.payments FOR ALL TO authenticated
  USING (private.has_tool(company_id, 'financeiro'))
  WITH CHECK (private.has_tool(company_id, 'financeiro'));

DROP POLICY IF EXISTS "crm_leads_team" ON public.crm_leads;
CREATE POLICY "crm_leads_tool" ON public.crm_leads FOR ALL TO authenticated
  USING (private.has_any_tool('crm'))
  WITH CHECK (private.has_any_tool('crm'));

DROP POLICY IF EXISTS "crm_activities_team" ON public.crm_activities;
CREATE POLICY "crm_activities_tool" ON public.crm_activities FOR ALL TO authenticated
  USING (private.has_any_tool('crm'))
  WITH CHECK (private.has_any_tool('crm'));

DROP POLICY IF EXISTS "tickets_own_select" ON public.tickets;
DROP POLICY IF EXISTS "tickets_own_insert" ON public.tickets;
DROP POLICY IF EXISTS "tickets_own_update" ON public.tickets;
DROP POLICY IF EXISTS "tickets_own_delete" ON public.tickets;
CREATE POLICY "tickets_own_select" ON public.tickets FOR SELECT TO authenticated
  USING ((created_by = auth.uid() AND private.has_any_tool('chamados')) OR private.is_superadmin());
CREATE POLICY "tickets_own_insert" ON public.tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND private.has_any_tool('chamados'));
CREATE POLICY "tickets_own_update" ON public.tickets FOR UPDATE TO authenticated
  USING ((created_by = auth.uid() AND private.has_any_tool('chamados')) OR private.is_superadmin())
  WITH CHECK ((created_by = auth.uid() AND private.has_any_tool('chamados')) OR private.is_superadmin());
CREATE POLICY "tickets_own_delete" ON public.tickets FOR DELETE TO authenticated
  USING ((created_by = auth.uid() AND private.has_any_tool('chamados')) OR private.is_superadmin());