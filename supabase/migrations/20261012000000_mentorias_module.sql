-- Migration: Modulo de Mentorias & Atendimentos no Hub de Pessoas
CREATE TABLE IF NOT EXISTS public.mentorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  candidate_id UUID REFERENCES public.candidates(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  cargo TEXT,
  idade INTEGER,
  formacao TEXT,
  telefone TEXT,
  email TEXT,
  status TEXT NOT NULL DEFAULT 'ativa', -- 'ativa' | 'inativa'
  behavioral_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  parecer_final TEXT,
  relatorio_final_url TEXT,
  finalizada_em TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.mentoria_sessoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentoria_id UUID NOT NULL REFERENCES public.mentorias(id) ON DELETE CASCADE,
  data_atendimento DATE NOT NULL DEFAULT CURRENT_DATE,
  horas NUMERIC(4,2) NOT NULL DEFAULT 1.00,
  resumo TEXT DEFAULT '',
  acoes JSONB NOT NULL DEFAULT '[]'::jsonb,
  pontos_atencao TEXT DEFAULT '',
  pontos_informe TEXT DEFAULT '',
  diagnostico JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.mentorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentoria_sessoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select mentorias"
  ON public.mentorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert mentorias"
  ON public.mentorias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update mentorias"
  ON public.mentorias FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete mentorias"
  ON public.mentorias FOR DELETE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select sessoes"
  ON public.mentoria_sessoes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert sessoes"
  ON public.mentoria_sessoes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update sessoes"
  ON public.mentoria_sessoes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete sessoes"
  ON public.mentoria_sessoes FOR DELETE TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_mentorias_company_id ON public.mentorias(company_id);
CREATE INDEX IF NOT EXISTS idx_mentorias_status ON public.mentorias(status);
CREATE INDEX IF NOT EXISTS idx_mentoria_sessoes_mentoria_id ON public.mentoria_sessoes(mentoria_id);
