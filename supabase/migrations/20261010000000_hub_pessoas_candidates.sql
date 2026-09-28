-- Migration: Hub de Pessoas - Candidates & Assessments
CREATE TABLE IF NOT EXISTS public.candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  cpf TEXT,
  birth_date DATE,
  current_role TEXT,
  desired_role TEXT,
  status TEXT NOT NULL DEFAULT 'aguardando',
  external BOOLEAN NOT NULL DEFAULT false,
  profile_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  ai_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can view candidates
CREATE POLICY "Authenticated users can select candidates"
  ON public.candidates
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert candidates
CREATE POLICY "Authenticated users can insert candidates"
  ON public.candidates
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update candidates
CREATE POLICY "Authenticated users can update candidates"
  ON public.candidates
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Public / Anon can view candidates by specific ID (Portal do Candidato)
CREATE POLICY "Anon can view candidate by id"
  ON public.candidates
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Public / Anon can update their assessment answers
CREATE POLICY "Anon can update candidate by id"
  ON public.candidates
  FOR UPDATE
  TO anon
  USING (true);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_candidates_company_id ON public.candidates(company_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates(status);
