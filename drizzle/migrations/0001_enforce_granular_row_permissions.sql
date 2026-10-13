ALTER TABLE public.candidates ADD COLUMN IF NOT EXISTS created_by uuid DEFAULT auth.uid();
CREATE OR REPLACE FUNCTION private.granular_row_access(_table text,_row jsonb,_action text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; owner_id uuid; parent_id uuid; tools text[]; row_name text; allowed boolean;
BEGIN
IF private.is_superadmin() THEN RETURN true; END IF;
IF NOT EXISTS(SELECT 1 FROM public.profiles WHERE user_id=auth.uid() AND status='active') THEN RETURN false; END IF;
cid:=nullif(_row->>'company_id','')::uuid;
owner_id:=nullif(_row->>'created_by','')::uuid;
CASE _table
WHEN 'companies' THEN cid:=(_row->>'id')::uuid; tools:=ARRAY['empresas']; IF _action='read' THEN RETURN private.has_company_access(cid); END IF;
WHEN 'projects' THEN tools:=ARRAY['projetos'];
WHEN 'action_plans' THEN tools:=ARRAY['planos_acao','mapa_estrategico','gut'];
WHEN 'action_plan_history' THEN SELECT company_id INTO cid FROM public.action_plans WHERE id=(_row->>'plan_id')::uuid; tools:=ARRAY['planos_acao','mapa_estrategico'];
WHEN 'calendar_events' THEN tools:=ARRAY['agenda']; IF cid IS NULL AND owner_id<>auth.uid() THEN RETURN false; END IF;
WHEN 'interviews' THEN tools:=ARRAY['entrevistas']; IF _action='read' THEN tools:=tools||ARRAY['analise_critica','relatorio_executivo','relatorio_mensal','relatorio_acompanhamento']; END IF;
WHEN 'transcripts' THEN SELECT company_id INTO cid FROM public.interviews WHERE id=(_row->>'interview_id')::uuid; tools:=ARRAY['entrevistas'];
WHEN 'interview_analysis' THEN SELECT company_id INTO cid FROM public.interviews WHERE id=(_row->>'interview_id')::uuid; tools:=ARRAY['entrevistas','analise_critica'];
WHEN 'transcript_edits' THEN SELECT i.company_id INTO cid FROM public.transcripts t JOIN public.interviews i ON i.id=t.interview_id WHERE t.id=(_row->>'transcript_id')::uuid; tools:=ARRAY['entrevistas'];
WHEN 'processes' THEN tools:=ARRAY['mapas_processos','tobe']; IF _action='read' THEN tools:=tools||ARRAY['fluxo_dores','fluxo_decisoes','fluxo_informacoes','cronoanalise','analise_critica','projetos','impacto']; END IF;
WHEN 'process_activities','process_edges','activity_connections','process_versions' THEN SELECT company_id INTO cid FROM public.processes WHERE id=(_row->>'process_id')::uuid; tools:=ARRAY['mapas_processos','tobe'];
WHEN 'activity_links','process_decisions' THEN SELECT p.company_id INTO cid FROM public.process_activities a JOIN public.processes p ON p.id=a.process_id WHERE a.id=(_row->>'activity_id')::uuid; tools:=ARRAY['mapas_processos','tobe'];
WHEN 'process_decision_map' THEN SELECT company_id INTO cid FROM public.processes WHERE id=(_row->>'process_id')::uuid; tools:=ARRAY['fluxo_decisoes'];
WHEN 'process_information_map' THEN SELECT company_id INTO cid FROM public.processes WHERE id=(_row->>'process_id')::uuid; tools:=ARRAY['fluxo_informacoes'];
WHEN 'pain_points' THEN tools:=ARRAY['fluxo_dores','entrevistas','analise_critica']; IF _action='read' THEN tools:=tools||ARRAY['oportunidades','causa_raiz','relatorio_executivo','relatorio_mensal','relatorio_acompanhamento']; END IF;
WHEN 'cronoanalysis_sessions' THEN tools:=ARRAY['cronoanalise'];
WHEN 'cronoanalysis_observations' THEN SELECT company_id INTO cid FROM public.cronoanalysis_sessions WHERE id=(_row->>'session_id')::uuid; tools:=ARRAY['cronoanalise'];
WHEN 'improvement_opportunities' THEN tools:=ARRAY['oportunidades']; IF _action='read' THEN tools:=tools||ARRAY['impacto','relatorio_executivo','relatorio_mensal']; END IF;
WHEN 'root_cause_analyses' THEN tools:=ARRAY['causa_raiz'];
WHEN 'root_cause_actions' THEN SELECT company_id INTO cid FROM public.root_cause_analyses WHERE id=(_row->>'analysis_id')::uuid; tools:=ARRAY['causa_raiz'];
WHEN 'prioritization_criteria' THEN tools:=ARRAY['gut'];
WHEN 'roadmap_items' THEN tools:=ARRAY['roadmap'];
WHEN 'tobe_change_log' THEN SELECT company_id INTO cid FROM public.processes WHERE id=(_row->>'tobe_process_id')::uuid; tools:=ARRAY['tobe'];
WHEN 'executive_diagnostics' THEN tools:=ARRAY['relatorio_executivo','relatorio_mensal','relatorio_acompanhamento'];
WHEN 'indicators' THEN tools:=ARRAY['indicadores_cadastro']; IF _action='read' THEN tools:=tools||ARRAY['indicadores_coleta','indicadores_historico','impacto','relatorio_executivo','relatorio_mensal','relatorio_acompanhamento']; END IF;
WHEN 'indicator_collections' THEN SELECT company_id INTO cid FROM public.indicators WHERE id=(_row->>'indicator_id')::uuid; tools:=ARRAY['indicadores_coleta']; IF _action='read' THEN tools:=tools||ARRAY['indicadores_historico','indicadores_cadastro','impacto','relatorio_executivo']; END IF;
WHEN 'pops' THEN tools:=ARRAY['pop_edicao']; IF _action='read' THEN tools:=tools||ARRAY['pop_leitura']; END IF;
WHEN 'invoices','invoice_items' THEN tools:=ARRAY['faturamentos']; IF _action='read' THEN tools:=tools||ARRAY['relatorios_faturamento','pagamentos']; END IF;
WHEN 'payments' THEN tools:=ARRAY['pagamentos']; IF _action='read' THEN tools:=tools||ARRAY['relatorios_faturamento']; END IF;
WHEN 'work_hours' THEN tools:=ARRAY['horas_lancamentos']; IF _action='read' THEN tools:=tools||ARRAY['horas_despesas','faturamentos','relatorios_faturamento']; ELSIF nullif(_row->>'user_id','')::uuid IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
WHEN 'work_hour_expenses','work_hour_tools' THEN SELECT company_id,user_id INTO cid,owner_id FROM public.work_hours WHERE id=(_row->>'work_hour_id')::uuid; tools:=ARRAY['horas_despesas']; IF _action='read' THEN tools:=tools||ARRAY['faturamentos','relatorios_faturamento']; ELSIF owner_id IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
WHEN 'candidates' THEN tools:=ARRAY['analise_perfil']; IF cid IS NULL AND owner_id IS DISTINCT FROM auth.uid() THEN RETURN false; END IF;
WHEN 'document_templates' THEN row_name:=_row->>'name'; IF row_name='__maia_finance_store_v1__' THEN RETURN public.has_company_permission(NULL,'faturamentos',_action); END IF; tools:=ARRAY['modelos_documentos'];
WHEN 'sectors' THEN IF _action='read' THEN RETURN private.has_company_access(cid); END IF; tools:=ARRAY['empresas'];
WHEN 'crm_leads' THEN tools:=ARRAY['crm_leads']; IF _action='read' THEN tools:=tools||ARRAY['crm_contratos']; END IF; RETURN EXISTS(SELECT 1 FROM unnest(tools) t WHERE public.has_company_permission(NULL,t,_action));
WHEN 'crm_activities' THEN RETURN public.has_company_permission(NULL,'crm_atividades',_action);
WHEN 'tickets' THEN IF _action='create' THEN RETURN owner_id=auth.uid() AND public.has_company_permission(NULL,CASE WHEN _row->>'kind'='bug' THEN 'chamados_erros' ELSE 'chamados_melhorias' END,'create'); END IF; IF _action='read' THEN RETURN public.has_company_permission(NULL,'chamados_acompanhamento','read') AND (owner_id=auth.uid() OR public.has_company_permission(NULL,'chamados_acompanhamento','update')); END IF; RETURN public.has_company_permission(NULL,'chamados_acompanhamento',_action) AND (_action='update' OR owner_id=auth.uid());
ELSE RETURN false;
END CASE;
IF cid IS NULL AND _table NOT IN ('calendar_events','candidates') THEN RETURN false; END IF;
RETURN EXISTS(SELECT 1 FROM unnest(tools) t WHERE public.has_company_permission(cid,t,_action));
END $$;
REVOKE ALL ON FUNCTION private.granular_row_access(text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.granular_row_access(text,jsonb,text) TO authenticated,service_role;
DO $$ DECLARE tbl text; command text; expression text; BEGIN
FOREACH tbl IN ARRAY ARRAY['companies','projects','action_plans','action_plan_history','calendar_events','interviews','transcripts','transcript_edits','interview_analysis','processes','process_activities','process_edges','activity_connections','activity_links','process_decisions','process_versions','process_decision_map','process_information_map','pain_points','cronoanalysis_sessions','cronoanalysis_observations','improvement_opportunities','root_cause_analyses','root_cause_actions','prioritization_criteria','roadmap_items','tobe_change_log','executive_diagnostics','indicators','indicator_collections','pops','invoices','invoice_items','payments','work_hours','work_hour_expenses','work_hour_tools','candidates','document_templates','sectors','crm_leads','crm_activities','tickets'] LOOP
FOREACH command IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
expression:=format('private.granular_row_access(%L,to_jsonb(%I),%L)',tbl,tbl,CASE command WHEN 'SELECT' THEN 'read' WHEN 'INSERT' THEN 'create' WHEN 'UPDATE' THEN 'update' ELSE 'delete' END);
IF command='INSERT' THEN EXECUTE format('CREATE POLICY granular_gate_%s ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK(%s)',lower(command),tbl,expression);
ELSIF command='UPDATE' THEN EXECUTE format('CREATE POLICY granular_gate_%s ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING(%s) WITH CHECK(%s)',lower(command),tbl,expression,expression);
ELSE EXECUTE format('CREATE POLICY granular_gate_%s ON public.%I AS RESTRICTIVE FOR %s TO authenticated USING(%s)',lower(command),tbl,command,expression); END IF;
END LOOP; END LOOP; END $$;
CREATE POLICY granular_enabled_read ON public.action_plans FOR SELECT TO authenticated USING(public.has_company_permission(company_id,'mapa_estrategico','read'));
CREATE POLICY granular_indicator_read ON public.indicators FOR SELECT TO authenticated USING(public.has_company_permission(company_id,'indicadores_historico','read') OR public.has_company_permission(company_id,'indicadores_coleta','read'));
CREATE POLICY granular_collection_read ON public.indicator_collections FOR SELECT TO authenticated USING(EXISTS(SELECT 1 FROM public.indicators i WHERE i.id=indicator_id AND public.has_company_permission(i.company_id,'indicadores_historico','read')));
COMMENT ON COLUMN public.profiles.is_superadmin IS 'Compatibility mirror; authorization source is protected public.user_roles.is_superadmin.';
CREATE OR REPLACE FUNCTION public.prevent_last_access_admin_removal() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN IF OLD.is_superadmin AND (TG_OP='DELETE' OR NOT NEW.is_superadmin) THEN PERFORM pg_advisory_xact_lock(729501); IF NOT EXISTS(SELECT 1 FROM public.user_roles WHERE is_superadmin AND id<>OLD.id) THEN RAISE EXCEPTION 'O último SuperAdmin não pode ser removido'; END IF; END IF; IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW; END $$;
REVOKE ALL ON FUNCTION public.prevent_last_access_admin_removal() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER protect_last_access_admin BEFORE DELETE OR UPDATE OF is_superadmin ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.prevent_last_access_admin_removal();