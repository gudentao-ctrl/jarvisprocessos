-- Migration: 20261013000000_recrutamento_ats.sql
-- Description: Módulo de Recrutamento & Seleção (ATS Kanban) para a Maia Consultoria

CREATE TABLE IF NOT EXISTS public.vagas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  empresa_nome TEXT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  departamento TEXT,
  tipo_contratacao TEXT DEFAULT 'CLT', -- 'CLT', 'PJ', 'Estágio', 'Temporário'
  jornada TEXT DEFAULT 'Presencial - 44h semanais',
  salario_min NUMERIC(12, 2) DEFAULT 0,
  salario_max NUMERIC(12, 2) DEFAULT 0,
  salario_combinar BOOLEAN DEFAULT FALSE,
  beneficios TEXT[] DEFAULT '{}',
  requisitos_formacao TEXT,
  experiencias_exigidas TEXT,
  ferramentas_obrigatorias TEXT[] DEFAULT '{}',
  soft_skills TEXT[] DEFAULT '{}',
  flyer_url TEXT,
  status TEXT DEFAULT 'ABERTA', -- 'ABERTA', 'EM_PAUSA', 'ENCERRADA'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.recrutamento_candidatos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  cpf TEXT,
  data_nascimento DATE,
  email TEXT,
  telefone TEXT,
  formacao TEXT,
  experiencias TEXT,
  ultimos_salarios TEXT,
  pretensao_salarial NUMERIC(12, 2),
  ferramentas TEXT[] DEFAULT '{}',
  curriculo_url TEXT,
  curriculo_nome TEXT,
  status_global TEXT DEFAULT 'EM_PROCESSO', -- 'EM_PROCESSO', 'BANCO_TALENTOS', 'CONTRATADO'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.candidaturas_funil (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vaga_id UUID NOT NULL REFERENCES public.vagas(id) ON DELETE CASCADE,
  candidato_id UUID NOT NULL REFERENCES public.recrutamento_candidatos(id) ON DELETE CASCADE,
  etapa_kanban TEXT NOT NULL DEFAULT 'TRIAGEM', 
  -- Etapas: 'TRIAGEM', 'ENTREVISTA_CONSULTORIA', 'ANALISE_PERFIL', 'ALINHAMENTO_CONTRATANTE', 'ENTREVISTA_CONTRATANTE', 'FINALIZACAO_CONTRATADO', 'BANCO_TALENTOS'
  historico_etapas JSONB DEFAULT '[]'::jsonb,
  parecer_consultoria JSONB DEFAULT '{}'::jsonb,
  analise_perfil JSONB DEFAULT '{}'::jsonb,
  proposta_contratacao JSONB DEFAULT '{}'::jsonb,
  avaliacao_cliente JSONB DEFAULT '{}'::jsonb,
  status TEXT DEFAULT 'ATIVO', -- 'ATIVO', 'REPROVADO', 'CONTRATADO'
  motivo_reprovacao TEXT,
  devolutiva_enviada BOOLEAN DEFAULT FALSE,
  data_devolutiva TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_vagas_empresa ON public.vagas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_vagas_status ON public.vagas(status);
CREATE INDEX IF NOT EXISTS idx_candidaturas_vaga ON public.candidaturas_funil(vaga_id);
CREATE INDEX IF NOT EXISTS idx_candidaturas_candidato ON public.candidaturas_funil(candidato_id);
CREATE INDEX IF NOT EXISTS idx_candidaturas_etapa ON public.candidaturas_funil(etapa_kanban);

-- Habilitar RLS
ALTER TABLE public.vagas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recrutamento_candidatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidaturas_funil ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura de vagas para usuários autenticados"
  ON public.vagas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir escrita de vagas para usuários autenticados"
  ON public.vagas FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir leitura de candidatos para usuários autenticados"
  ON public.recrutamento_candidatos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir escrita de candidatos para usuários autenticados"
  ON public.recrutamento_candidatos FOR ALL TO authenticated USING (true);

CREATE POLICY "Permitir leitura de candidaturas para usuários autenticados"
  ON public.candidaturas_funil FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir escrita de candidaturas para usuários autenticados"
  ON public.candidaturas_funil FOR ALL TO authenticated USING (true);
