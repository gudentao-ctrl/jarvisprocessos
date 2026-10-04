CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name text NOT NULL CHECK (char_length(full_name) BETWEEN 2 AND 150),
  cpf text NOT NULL CHECK (cpf ~ '^[0-9]{11}$'),
  birth_date date NOT NULL,
  email text NOT NULL CHECK (char_length(email) <= 255),
  "current_role" text,
  desired_role text,
  status text NOT NULL DEFAULT 'aguardando' CHECK (status IN ('aguardando','em_teste','concluido')),
  external boolean NOT NULL DEFAULT false,
  profile_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ai_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  public_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  consent_version text,
  privacy_consent_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.candidates TO authenticated;
GRANT ALL ON public.candidates TO service_role;

ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select candidates"
ON public.candidates FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert candidates"
ON public.candidates FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update candidates"
ON public.candidates FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated users can delete candidates"
ON public.candidates FOR DELETE TO authenticated USING (true);

CREATE INDEX candidates_company_id_idx ON public.candidates(company_id);
CREATE INDEX candidates_status_idx ON public.candidates(status);

CREATE OR REPLACE FUNCTION public.lock_completed_candidate_assessment()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL AND (
    NEW.profile_data IS DISTINCT FROM OLD.profile_data
    OR NEW.started_at IS DISTINCT FROM OLD.started_at
    OR NEW.completed_at IS DISTINCT FROM OLD.completed_at
    OR NEW.status IS DISTINCT FROM OLD.status
  ) THEN
    RAISE EXCEPTION 'A avaliação concluída não pode ser alterada';
  END IF;

  IF OLD.started_at IS NOT NULL AND NEW.started_at IS DISTINCT FROM OLD.started_at THEN
    RAISE EXCEPTION 'O início da avaliação não pode ser alterado';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS candidates_lock_completed_assessment ON public.candidates;
CREATE TRIGGER candidates_lock_completed_assessment
BEFORE UPDATE ON public.candidates
FOR EACH ROW EXECUTE FUNCTION public.lock_completed_candidate_assessment();