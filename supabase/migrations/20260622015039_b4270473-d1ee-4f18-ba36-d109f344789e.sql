
-- Status enum
DO $$ BEGIN
  CREATE TYPE public.project_status AS ENUM ('planejamento','em_andamento','pausado','concluido','arquivado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Projects table
CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text DEFAULT '',
  responsible text DEFAULT '',
  status public.project_status NOT NULL DEFAULT 'planejamento',
  start_date date,
  end_date date,
  progress_pct int NOT NULL DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_company_idx ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.projects TO authenticated;
GRANT ALL ON public.projects TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages projects" ON public.projects FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Add project_id to existing tables (nullable for backward compatibility)
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.indicators ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.action_plans ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.improvement_opportunities ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.cronoanalysis_sessions ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.pain_points ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.roadmap_items ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.root_cause_analyses ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;
ALTER TABLE public.executive_diagnostics ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS interviews_project_idx ON public.interviews(project_id);
CREATE INDEX IF NOT EXISTS processes_project_idx ON public.processes(project_id);
CREATE INDEX IF NOT EXISTS indicators_project_idx ON public.indicators(project_id);
CREATE INDEX IF NOT EXISTS action_plans_project_idx ON public.action_plans(project_id);
CREATE INDEX IF NOT EXISTS opportunities_project_idx ON public.improvement_opportunities(project_id);
