CREATE TABLE public.pops (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Novo POP',
  status text NOT NULL DEFAULT 'rascunho',
  source_type text NOT NULL DEFAULT 'texto',
  source_path text,
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pops TO authenticated;
GRANT ALL ON public.pops TO service_role;

ALTER TABLE public.pops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users manage pops"
ON public.pops FOR ALL TO authenticated
USING (true) WITH CHECK (true);

CREATE TRIGGER pops_set_updated_at
BEFORE UPDATE ON public.pops
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();