CREATE TABLE IF NOT EXISTS public.fives_configuracoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,
  company_name text,
  url_hash text NOT NULL UNIQUE DEFAULT (replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','')),
  logo_url text,
  header_banner_url text,
  slogan_campanha text,
  primary_color text NOT NULL DEFAULT '#3E100C',
  secondary_color text NOT NULL DEFAULT '#E05A10',
  bg_color text NOT NULL DEFAULT '#FFF8F5',
  senso_destaque_mes text,
  comite_membros jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fives_setores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  nome_setor text NOT NULL,
  descricao text,
  guardiao_nome text,
  guardiao_user_id uuid,
  auditor_nome text,
  auditor_user_id uuid,
  meta_nota numeric NOT NULL DEFAULT 90,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_setores_company ON public.fives_setores(company_id);

CREATE TABLE IF NOT EXISTS public.fives_instrucoes_trabalho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL UNIQUE REFERENCES public.fives_setores(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  documento_url text,
  foto_padrao_ouro_url text,
  rotina_limpeza jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.fives_auditorias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.fives_setores(id) ON DELETE CASCADE,
  auditor_user_id uuid,
  auditor_nome text,
  data_auditoria timestamptz NOT NULL DEFAULT now(),
  nota_final_percent numeric NOT NULL,
  status_conclusao text NOT NULL DEFAULT 'CONCLUIDO',
  observacoes_gerais text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_auditorias_setor ON public.fives_auditorias(setor_id);

CREATE TABLE IF NOT EXISTS public.fives_auditoria_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auditoria_id uuid NOT NULL REFERENCES public.fives_auditorias(id) ON DELETE CASCADE,
  senso text NOT NULL,
  pergunta text NOT NULL,
  nota int NOT NULL CHECK (nota BETWEEN 0 AND 5),
  foto_evidencia_url text,
  observacao text,
  plano_acao_o_que text,
  plano_acao_responsavel text,
  plano_acao_prazo date,
  plano_acao_status text NOT NULL DEFAULT 'PENDENTE'
);
CREATE INDEX IF NOT EXISTS idx_fives_auditoria_itens_auditoria ON public.fives_auditoria_itens(auditoria_id);

CREATE TABLE IF NOT EXISTS public.fives_descartes_cartao_vermelho (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_id uuid NOT NULL REFERENCES public.fives_setores(id) ON DELETE CASCADE,
  item_descricao text NOT NULL,
  localizacao text,
  foto_url text,
  data_limite date,
  destinacao_status text NOT NULL DEFAULT 'PENDENTE',
  destinacao_observacao text,
  arquivado boolean NOT NULL DEFAULT false,
  data_conclusao timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_descartes_setor ON public.fives_descartes_cartao_vermelho(setor_id, arquivado);

CREATE TABLE IF NOT EXISTS public.fives_mural_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.fives_setores(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  descricao text,
  foto_antes_url text NOT NULL,
  foto_depois_url text NOT NULL,
  data_registro date DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_mural_company ON public.fives_mural_fotos(company_id);

CREATE TABLE IF NOT EXISTS public.fives_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  setor_id uuid REFERENCES public.fives_setores(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  descricao text,
  tipo text NOT NULL DEFAULT 'DIA_D',
  data_evento date NOT NULL,
  horario text,
  responsavel text,
  concluido boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_eventos_company ON public.fives_eventos(company_id);

CREATE TABLE IF NOT EXISTS public.fives_cronograma_projeto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  etapa_titulo text NOT NULL,
  descricao text,
  data_inicio date,
  data_fim date,
  data_execucao date,
  responsavel text,
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE','EM_ANDAMENTO','CONCLUIDO')),
  ordem int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_cronograma_company ON public.fives_cronograma_projeto(company_id);

CREATE TABLE IF NOT EXISTS public.fives_perguntas_customizadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  senso text NOT NULL,
  titulo_pergunta text NOT NULL,
  criterio_avaliacao text NOT NULL DEFAULT '',
  ativo boolean NOT NULL DEFAULT true,
  ordem int NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fives_perguntas_company ON public.fives_perguntas_customizadas(company_id, ativo);

CREATE OR REPLACE FUNCTION private.fives_setor_company(_setor_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT company_id FROM public.fives_setores WHERE id = _setor_id
$$;
CREATE OR REPLACE FUNCTION private.fives_auditoria_company(_auditoria_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.company_id FROM public.fives_auditorias a JOIN public.fives_setores s ON s.id = a.setor_id WHERE a.id = _auditoria_id
$$;
REVOKE ALL ON FUNCTION private.fives_setor_company(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.fives_auditoria_company(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.fives_setor_company(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.fives_auditoria_company(uuid) TO authenticated;

DO $$
DECLARE t text; expr text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fives_configuracoes','fives_setores','fives_mural_fotos','fives_eventos','fives_cronograma_projeto','fives_perguntas_customizadas','fives_instrucoes_trabalho','fives_auditorias','fives_descartes_cartao_vermelho','fives_auditoria_itens'] LOOP
    expr := CASE
      WHEN t IN ('fives_instrucoes_trabalho','fives_auditorias','fives_descartes_cartao_vermelho') THEN 'private.fives_setor_company(setor_id)'
      WHEN t = 'fives_auditoria_itens' THEN 'private.fives_auditoria_company(auditoria_id)'
      ELSE 'company_id' END;
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('REVOKE ALL ON public.%I FROM anon', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('CREATE POLICY fives_read ON public.%I FOR SELECT TO authenticated USING (public.has_company_permission(%s, ''hub_5s'', ''read''))', t, expr);
    EXECUTE format('CREATE POLICY fives_create ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_company_permission(%s, ''hub_5s'', ''create''))', t, expr);
    EXECUTE format('CREATE POLICY fives_update ON public.%I FOR UPDATE TO authenticated USING (public.has_company_permission(%s, ''hub_5s'', ''update'')) WITH CHECK (public.has_company_permission(%s, ''hub_5s'', ''update''))', t, expr, expr);
    EXECUTE format('CREATE POLICY fives_delete ON public.%I FOR DELETE TO authenticated USING (public.has_company_permission(%s, ''hub_5s'', ''delete''))', t, expr);
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_fives_portal(_hash text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE cfg public.fives_configuracoes; comp record; result jsonb;
BEGIN
  IF _hash IS NULL OR length(_hash) < 20 OR length(_hash) > 200 THEN RETURN NULL; END IF;
  SELECT * INTO cfg FROM public.fives_configuracoes WHERE url_hash = _hash;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT id, name, public_company_logo_url INTO comp FROM public.companies WHERE id = cfg.company_id;
  SELECT jsonb_build_object(
    'config', to_jsonb(cfg),
    'company', jsonb_build_object('id', comp.id, 'name', comp.name, 'logo_url', coalesce(cfg.logo_url, comp.public_company_logo_url)),
    'setores', coalesce((SELECT jsonb_agg(to_jsonb(s) ORDER BY s.created_at) FROM public.fives_setores s WHERE s.company_id = cfg.company_id), '[]'::jsonb),
    'its', coalesce((SELECT jsonb_agg(to_jsonb(i)) FROM public.fives_instrucoes_trabalho i JOIN public.fives_setores s ON s.id = i.setor_id WHERE s.company_id = cfg.company_id), '[]'::jsonb),
    'auditorias', coalesce((SELECT jsonb_agg(to_jsonb(a) || jsonb_build_object('itens', coalesce((SELECT jsonb_agg(to_jsonb(it)) FROM public.fives_auditoria_itens it WHERE it.auditoria_id = a.id), '[]'::jsonb)) ORDER BY a.data_auditoria DESC) FROM public.fives_auditorias a JOIN public.fives_setores s ON s.id = a.setor_id WHERE s.company_id = cfg.company_id), '[]'::jsonb),
    'descartes', coalesce((SELECT jsonb_agg(to_jsonb(d) || jsonb_build_object('setor_nome', s.nome_setor) ORDER BY d.created_at DESC) FROM public.fives_descartes_cartao_vermelho d JOIN public.fives_setores s ON s.id = d.setor_id WHERE s.company_id = cfg.company_id), '[]'::jsonb),
    'mural', coalesce((SELECT jsonb_agg(to_jsonb(m) ORDER BY m.created_at DESC) FROM public.fives_mural_fotos m WHERE m.company_id = cfg.company_id), '[]'::jsonb),
    'eventos', coalesce((SELECT jsonb_agg(to_jsonb(e) ORDER BY e.data_evento) FROM public.fives_eventos e WHERE e.company_id = cfg.company_id), '[]'::jsonb),
    'cronograma', coalesce((SELECT jsonb_agg(to_jsonb(c) ORDER BY c.ordem) FROM public.fives_cronograma_projeto c WHERE c.company_id = cfg.company_id), '[]'::jsonb)
  ) INTO result;
  RETURN result;
END $$;
REVOKE ALL ON FUNCTION public.get_fives_portal(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_fives_portal(text) TO anon, authenticated;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fives_configuracoes','fives_setores','fives_auditorias','fives_descartes_cartao_vermelho','fives_mural_fotos','fives_eventos','fives_cronograma_projeto'] LOOP
    BEGIN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;