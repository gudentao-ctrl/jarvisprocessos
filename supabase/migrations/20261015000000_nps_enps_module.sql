-- Migration: 20261015000000_nps_enps_module.sql
-- Módulo de Pesquisas NPS e eNPS (Bloco 26) para Hub de Pessoas

CREATE TABLE IF NOT EXISTS public.pesquisas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'nps', -- 'nps' | 'enps'
  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' | 'inativa'
  url_hash TEXT NOT NULL UNIQUE,
  config_visual JSONB NOT NULL DEFAULT '{
    "bg_color": "#FFF8F5",
    "primary_color": "#E05A10",
    "text_color": "#2B1B17",
    "card_bg_color": "#FFFFFF",
    "logo_url": "",
    "welcome_msg": "Bem-vindo(a) à nossa pesquisa de satisfação. Sua opinião sincera é muito importante para nós!",
    "thanks_msg": "Agradecemos imensamente pela sua participação! Suas respostas nos ajudam a evoluir continuamente."
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pesquisa_perguntas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  ordem INTEGER NOT NULL DEFAULT 1,
  titulo_pergunta TEXT NOT NULL,
  tipo_resposta TEXT NOT NULL DEFAULT 'nps_score', -- 'nps_score' (0-10) | 'rating' (1-5) | 'text_open'
  obrigatorio BOOLEAN NOT NULL DEFAULT true,
  placeholder TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pesquisa_respostas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pesquisa_id UUID NOT NULL REFERENCES public.pesquisas(id) ON DELETE CASCADE,
  session_id TEXT DEFAULT '',
  respondente_info JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.pesquisa_respostas_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resposta_id UUID NOT NULL REFERENCES public.pesquisa_respostas(id) ON DELETE CASCADE,
  pergunta_id UUID NOT NULL REFERENCES public.pesquisa_perguntas(id) ON DELETE CASCADE,
  valor_nota INTEGER,
  valor_texto TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_pesquisas_url_hash ON public.pesquisas(url_hash);
CREATE INDEX IF NOT EXISTS idx_pesquisas_empresa_id ON public.pesquisas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisas_status ON public.pesquisas(status);
CREATE INDEX IF NOT EXISTS idx_pesquisa_perguntas_pesquisa_id ON public.pesquisa_perguntas(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_perguntas_ordem ON public.pesquisa_perguntas(pesquisa_id, ordem);
CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_pesquisa_id ON public.pesquisa_respostas(pesquisa_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_itens_resposta ON public.pesquisa_respostas_itens(resposta_id);
CREATE INDEX IF NOT EXISTS idx_pesquisa_respostas_itens_pergunta ON public.pesquisa_respostas_itens(pergunta_id);

-- RLS
ALTER TABLE public.pesquisas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_perguntas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_respostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pesquisa_respostas_itens ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários autenticados (Gestão)
CREATE POLICY "Pesquisas: leitura para autenticados"
  ON public.pesquisas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pesquisas: escrita para autenticados"
  ON public.pesquisas FOR ALL TO authenticated USING (true);

CREATE POLICY "Perguntas: leitura para autenticados"
  ON public.pesquisa_perguntas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Perguntas: escrita para autenticados"
  ON public.pesquisa_perguntas FOR ALL TO authenticated USING (true);

CREATE POLICY "Respostas: leitura para autenticados"
  ON public.pesquisa_respostas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Respostas: escrita para autenticados"
  ON public.pesquisa_respostas FOR ALL TO authenticated USING (true);

CREATE POLICY "Respostas Itens: leitura para autenticados"
  ON public.pesquisa_respostas_itens FOR SELECT TO authenticated USING (true);
CREATE POLICY "Respostas Itens: escrita para autenticados"
  ON public.pesquisa_respostas_itens FOR ALL TO authenticated USING (true);

-- Políticas Públicas / Anônimas para a tela do respondente (sem login)
CREATE POLICY "Público: leitura de pesquisa por hash ativo"
  ON public.pesquisas FOR SELECT TO anon USING (status = 'ativa');

CREATE POLICY "Público: leitura de perguntas para pesquisa ativa"
  ON public.pesquisa_perguntas FOR SELECT TO anon USING (true);

CREATE POLICY "Público: inserção de respostas"
  ON public.pesquisa_respostas FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Público: inserção de itens de resposta"
  ON public.pesquisa_respostas_itens FOR INSERT TO anon WITH CHECK (true);
