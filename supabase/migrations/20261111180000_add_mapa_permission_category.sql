-- Migration: Adicionar categoria 'mapa' e suporte a alçada granular para 'mapa_estrategico'

CREATE OR REPLACE FUNCTION public.has_company_permission(_company_id uuid,_tool text,_action text DEFAULT 'read')
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
SELECT private.is_superadmin() OR EXISTS(
  SELECT 1 FROM public.user_company_permissions m
  JOIN public.profiles p ON p.user_id=m.user_id
  WHERE m.user_id=auth.uid() AND p.status='active'
    AND (_company_id IS NULL OR m.company_id=_company_id)
    AND CASE WHEN m.permissions->>'version'='1' THEN
      coalesce((m.permissions->'sub_modules'->>_tool)::boolean,false)
      AND coalesce((m.permissions->'actions'->_tool->>_action)::boolean,false)
      AND (
        coalesce((m.permissions->'categories'->>(
          CASE
            WHEN _tool = 'mapa_estrategico' THEN 'mapa'
            WHEN _tool IN ('portal_empresa','portal_resultados') THEN 'portal'
            WHEN _tool LIKE 'indicadores_%' THEN 'indicadores'
            WHEN _tool LIKE 'pop_%' THEN 'pop'
            WHEN _tool LIKE 'horas_%' THEN 'horas'
            WHEN _tool IN ('faturamentos','pagamentos','relatorios_faturamento') THEN 'financeiro'
            WHEN _tool LIKE 'crm_%' THEN 'crm'
            WHEN _tool LIKE 'chamados_%' THEN 'chamados'
            ELSE 'gestao'
          END))::boolean, false)
        OR (
          _tool = 'mapa_estrategico' AND coalesce((m.permissions->'categories'->>'gestao')::boolean, false)
        )
      )
    ELSE
      (
        coalesce((m.permissions->>(
          CASE
            WHEN _tool = 'mapa_estrategico' THEN 'mapa'
            WHEN _tool IN ('portal_empresa','portal_resultados') THEN 'portal'
            WHEN _tool LIKE 'indicadores_%' THEN 'indicadores'
            WHEN _tool LIKE 'pop_%' THEN 'pop'
            WHEN _tool LIKE 'horas_%' THEN 'horas'
            WHEN _tool IN ('faturamentos','pagamentos','relatorios_faturamento') THEN 'financeiro'
            WHEN _tool LIKE 'crm_%' THEN 'crm'
            WHEN _tool LIKE 'chamados_%' THEN 'chamados'
            ELSE 'gestao'
          END))::boolean, false)
        OR (
          _tool = 'mapa_estrategico' AND coalesce((m.permissions->>'gestao')::boolean, false)
        )
      )
    END
) $$;

REVOKE ALL ON FUNCTION public.has_company_permission(uuid,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.has_company_permission(uuid,text,text) TO authenticated,service_role;
