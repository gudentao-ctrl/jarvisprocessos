CREATE TABLE public.vagas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.companies(id), empresa_nome text, titulo text NOT NULL, descricao text DEFAULT '', departamento text, tipo_contratacao text DEFAULT 'CLT', jornada text, salario_min numeric DEFAULT 0, salario_max numeric DEFAULT 0, salario_combinar boolean DEFAULT false, beneficios text[] DEFAULT '{}', requisitos_formacao text, experiencias_exigidas text, ferramentas_obrigatorias text[] DEFAULT '{}', soft_skills text[] DEFAULT '{}', flyer_url text, status text DEFAULT 'ABERTA', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.vagas TO authenticated; GRANT ALL ON public.vagas TO service_role;
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.recrutamento_candidatos(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.companies(id), nome text NOT NULL, cpf text, data_nascimento date, email text, telefone text, formacao text, experiencias text, ultimos_salarios text, pretensao_salarial numeric, ferramentas text[] DEFAULT '{}', curriculo_url text, curriculo_nome text, curriculo_texto text, status_global text DEFAULT 'EM_PROCESSO', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.recrutamento_candidatos TO authenticated; GRANT ALL ON public.recrutamento_candidatos TO service_role;
ALTER TABLE public.recrutamento_candidatos ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.candidaturas_funil(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), vaga_id uuid NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE, candidato_id uuid NOT NULL REFERENCES public.recrutamento_candidatos(id) ON DELETE CASCADE, etapa_kanban text DEFAULT 'TRIAGEM', historico_etapas jsonb DEFAULT '[]', parecer_consultoria jsonb DEFAULT '{}', analise_perfil jsonb DEFAULT '{}', proposta_contratacao jsonb DEFAULT '{}', avaliacao_cliente jsonb DEFAULT '{}', status text DEFAULT 'ATIVO', motivo_reprovacao text, devolutiva_enviada boolean DEFAULT false, data_devolutiva timestamptz, created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.candidaturas_funil TO authenticated; GRANT ALL ON public.candidaturas_funil TO service_role;
ALTER TABLE public.candidaturas_funil ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.mentorias(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL REFERENCES public.companies(id), candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL, nome text NOT NULL, cargo text, idade integer, formacao text, telefone text, email text, status text DEFAULT 'ativa', behavioral_profile jsonb DEFAULT '{}', parecer_final text, relatorio_final_url text, finalizada_em timestamptz, created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mentorias TO authenticated; GRANT ALL ON public.mentorias TO service_role;
ALTER TABLE public.mentorias ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.mentoria_sessoes(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), mentoria_id uuid NOT NULL REFERENCES public.mentorias(id) ON DELETE CASCADE, data_atendimento date NOT NULL DEFAULT current_date, horas numeric DEFAULT 1, objetivo_sessao text, resumo text, acoes jsonb DEFAULT '[]', avancos_observados text, pontos_desenvolvimento text, evidencias_comportamentais text, foco_proxima_sessao text, pontos_atencao text, pontos_informe text, diagnostico jsonb DEFAULT '{}', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.mentoria_sessoes TO authenticated; GRANT ALL ON public.mentoria_sessoes TO service_role;
ALTER TABLE public.mentoria_sessoes ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pesquisas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), empresa_id uuid NOT NULL REFERENCES public.companies(id), titulo text NOT NULL, descricao text DEFAULT '', tipo text DEFAULT 'nps', status text DEFAULT 'ativa', url_hash text UNIQUE NOT NULL DEFAULT gen_random_uuid()::text, config_visual jsonb DEFAULT '{}', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pesquisas TO authenticated; GRANT ALL ON public.pesquisas TO service_role;
ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pesquisa_perguntas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pesquisa_id uuid NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE, ordem integer DEFAULT 1, titulo_pergunta text NOT NULL, tipo_resposta text DEFAULT 'nps_score', obrigatorio boolean DEFAULT true, placeholder text DEFAULT '', opcoes_lista text[] DEFAULT '{}', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pesquisa_perguntas TO authenticated; GRANT ALL ON public.pesquisa_perguntas TO service_role;
ALTER TABLE public.pesquisa_perguntas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pesquisa_respostas(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pesquisa_id uuid NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE, session_id text DEFAULT '', respondente_info jsonb DEFAULT '{}', created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), UNIQUE(pesquisa_id,session_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pesquisa_respostas TO authenticated; GRANT ALL ON public.pesquisa_respostas TO service_role;
ALTER TABLE public.pesquisa_respostas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.pesquisa_respostas_itens(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), resposta_id uuid NOT NULL REFERENCES public.pesquisa_respostas(id) ON DELETE CASCADE, pergunta_id uuid NOT NULL REFERENCES public.pesquisa_perguntas(id), valor_nota integer, valor_texto text, created_by uuid DEFAULT auth.uid(), created_at timestamptz DEFAULT now(), UNIQUE(resposta_id,pergunta_id));
GRANT SELECT,INSERT,UPDATE,DELETE ON public.pesquisa_respostas_itens TO authenticated; GRANT ALL ON public.pesquisa_respostas_itens TO service_role;
ALTER TABLE public.pesquisa_respostas_itens ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION private.people_row_access(_table text,_row jsonb,_action text) RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public AS $$
DECLARE cid uuid; tool text;
BEGIN
IF private.is_superadmin() THEN RETURN true; END IF;
CASE _table
WHEN 'vagas','recrutamento_candidatos' THEN cid:=(_row->>'empresa_id')::uuid; tool:='recrutamento';
WHEN 'candidaturas_funil' THEN SELECT empresa_id INTO cid FROM public.vagas WHERE id=(_row->>'vaga_id')::uuid; tool:='recrutamento';
WHEN 'mentorias' THEN cid:=(_row->>'company_id')::uuid; tool:='mentorias';
WHEN 'mentoria_sessoes' THEN SELECT company_id INTO cid FROM public.mentorias WHERE id=(_row->>'mentoria_id')::uuid; tool:='mentorias';
WHEN 'pesquisas' THEN cid:=(_row->>'empresa_id')::uuid; tool:='nps_enps';
WHEN 'pesquisa_perguntas','pesquisa_respostas' THEN SELECT empresa_id INTO cid FROM public.pesquisas WHERE id=(_row->>'pesquisa_id')::uuid; tool:='nps_enps';
WHEN 'pesquisa_respostas_itens' THEN SELECT p.empresa_id INTO cid FROM public.pesquisa_respostas r JOIN public.pesquisas p ON p.id=r.pesquisa_id WHERE r.id=(_row->>'resposta_id')::uuid; tool:='nps_enps';
ELSE RETURN false;
END CASE;
RETURN cid IS NOT NULL AND public.has_company_permission(cid,tool,_action);
END $$;
REVOKE ALL ON FUNCTION private.people_row_access(text,jsonb,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION private.people_row_access(text,jsonb,text) TO authenticated,service_role;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['vagas','recrutamento_candidatos','candidaturas_funil','mentorias','mentoria_sessoes','pesquisas','pesquisa_perguntas','pesquisa_respostas','pesquisa_respostas_itens'] LOOP
EXECUTE format('CREATE POLICY people_read ON public.%I FOR SELECT TO authenticated USING (private.people_row_access(%L,to_jsonb(%I.*),''read''))',t,t,t);
EXECUTE format('CREATE POLICY people_create ON public.%I FOR INSERT TO authenticated WITH CHECK (private.people_row_access(%L,to_jsonb(%I.*),''create''))',t,t,t);
EXECUTE format('CREATE POLICY people_update ON public.%I FOR UPDATE TO authenticated USING (private.people_row_access(%L,to_jsonb(%I.*),''update'')) WITH CHECK (private.people_row_access(%L,to_jsonb(%I.*),''update''))',t,t,t,t,t);
EXECUTE format('CREATE POLICY people_delete ON public.%I FOR DELETE TO authenticated USING (private.people_row_access(%L,to_jsonb(%I.*),''delete''))',t,t,t);
END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.validate_people_relations() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE vc uuid; cc uuid;
BEGIN
IF TG_TABLE_NAME='candidaturas_funil' THEN
 SELECT empresa_id INTO vc FROM public.vagas WHERE id=NEW.vaga_id;
 SELECT empresa_id INTO cc FROM public.recrutamento_candidatos WHERE id=NEW.candidato_id;
 IF vc IS DISTINCT FROM cc THEN RAISE EXCEPTION 'Candidato e vaga devem pertencer à mesma empresa'; END IF;
ELSIF TG_TABLE_NAME='mentorias' AND NEW.candidate_id IS NOT NULL THEN
 SELECT company_id INTO cc FROM public.candidates WHERE id=NEW.candidate_id AND completed_at IS NOT NULL;
 IF cc IS NULL OR cc IS DISTINCT FROM NEW.company_id THEN RAISE EXCEPTION 'Avaliação concluída da mesma empresa obrigatória'; END IF;
END IF;
RETURN NEW; END $$;
CREATE TRIGGER validate_recruitment_company BEFORE INSERT OR UPDATE ON public.candidaturas_funil FOR EACH ROW EXECUTE FUNCTION public.validate_people_relations();
CREATE TRIGGER validate_mentorship_candidate BEFORE INSERT OR UPDATE ON public.mentorias FOR EACH ROW EXECUTE FUNCTION public.validate_people_relations();
CREATE INDEX vagas_company_idx ON public.vagas(empresa_id);
CREATE INDEX recrutamento_company_idx ON public.recrutamento_candidatos(empresa_id);
CREATE INDEX mentorias_company_idx ON public.mentorias(company_id);
CREATE INDEX pesquisas_company_idx ON public.pesquisas(empresa_id);
CREATE INDEX candidaturas_vaga_idx ON public.candidaturas_funil(vaga_id);
CREATE INDEX sessoes_mentoria_idx ON public.mentoria_sessoes(mentoria_id);
CREATE INDEX perguntas_pesquisa_idx ON public.pesquisa_perguntas(pesquisa_id);
CREATE INDEX respostas_pesquisa_idx ON public.pesquisa_respostas(pesquisa_id);