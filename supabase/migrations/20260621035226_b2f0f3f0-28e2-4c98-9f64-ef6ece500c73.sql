
-- ========== ENUMS ==========
CREATE TYPE public.process_kind AS ENUM ('as_is','to_be');
CREATE TYPE public.process_status AS ENUM ('draft','approved','archived');
CREATE TYPE public.opportunity_status AS ENUM ('sugerida','aprovada','rejeitada','em_andamento','implementada');
CREATE TYPE public.opportunity_source AS ENUM ('ia','manual');
CREATE TYPE public.effort_level AS ENUM ('baixo','medio','alto');
CREATE TYPE public.impact_level AS ENUM ('baixo','medio','alto');
CREATE TYPE public.opportunity_priority AS ENUM ('baixa','media','alta','critica');
CREATE TYPE public.rca_method AS ENUM ('cinco_porques','ishikawa','categoria');
CREATE TYPE public.rca_action_kind AS ENUM ('corretiva','preventiva');
CREATE TYPE public.roadmap_horizon AS ENUM ('curto','medio','longo');
CREATE TYPE public.roadmap_status AS ENUM ('planejado','em_andamento','concluido','cancelado');
CREATE TYPE public.tobe_change_type AS ENUM ('added','removed','modified','simplified');
CREATE TYPE public.version_kind AS ENUM ('as_is','to_be');

-- ========== EXTEND processes ==========
ALTER TABLE public.processes
  ADD COLUMN kind public.process_kind NOT NULL DEFAULT 'as_is',
  ADD COLUMN status public.process_status NOT NULL DEFAULT 'draft',
  ADD COLUMN source_process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL;

-- ========== process_versions ==========
CREATE TABLE public.process_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  version_no integer NOT NULL,
  kind public.version_kind NOT NULL,
  label text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_versions TO authenticated;
GRANT ALL ON public.process_versions TO service_role;
ALTER TABLE public.process_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages process versions" ON public.process_versions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========== improvement_opportunities ==========
CREATE TABLE public.improvement_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  tobe_process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  pain_point_id uuid REFERENCES public.pain_points(id) ON DELETE SET NULL,
  indicator_id uuid REFERENCES public.indicators(id) ON DELETE SET NULL,
  root_cause_id uuid,
  action_plan_id uuid,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'desperdicio',
  expected_benefit text NOT NULL DEFAULT '',
  effort public.effort_level NOT NULL DEFAULT 'medio',
  impact public.impact_level NOT NULL DEFAULT 'medio',
  priority_score numeric(10,2) NOT NULL DEFAULT 0,
  priority public.opportunity_priority NOT NULL DEFAULT 'media',
  status public.opportunity_status NOT NULL DEFAULT 'sugerida',
  source public.opportunity_source NOT NULL DEFAULT 'manual',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.improvement_opportunities TO authenticated;
GRANT ALL ON public.improvement_opportunities TO service_role;
ALTER TABLE public.improvement_opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages opportunities" ON public.improvement_opportunities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_opp_updated BEFORE UPDATE ON public.improvement_opportunities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== prioritization_criteria ==========
CREATE TABLE public.prioritization_criteria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  weights jsonb NOT NULL DEFAULT '{"impacto":3,"urgencia":2,"esforco":2,"risco":2,"custo":1,"alinhamento":2}'::jsonb,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prioritization_criteria TO authenticated;
GRANT ALL ON public.prioritization_criteria TO service_role;
ALTER TABLE public.prioritization_criteria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages criteria" ON public.prioritization_criteria FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_crit_updated BEFORE UPDATE ON public.prioritization_criteria FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== root_cause_analyses ==========
CREATE TABLE public.root_cause_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  pain_point_id uuid REFERENCES public.pain_points(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES public.improvement_opportunities(id) ON DELETE SET NULL,
  problem text NOT NULL,
  method public.rca_method NOT NULL DEFAULT 'cinco_porques',
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  conclusion text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.root_cause_analyses TO authenticated;
GRANT ALL ON public.root_cause_analyses TO service_role;
ALTER TABLE public.root_cause_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages rca" ON public.root_cause_analyses FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_rca_updated BEFORE UPDATE ON public.root_cause_analyses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.improvement_opportunities
  ADD CONSTRAINT improvement_opportunities_root_cause_fk
  FOREIGN KEY (root_cause_id) REFERENCES public.root_cause_analyses(id) ON DELETE SET NULL;

-- ========== root_cause_actions ==========
CREATE TABLE public.root_cause_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id uuid NOT NULL REFERENCES public.root_cause_analyses(id) ON DELETE CASCADE,
  kind public.rca_action_kind NOT NULL DEFAULT 'corretiva',
  description text NOT NULL,
  action_plan_id uuid REFERENCES public.action_plans(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.root_cause_actions TO authenticated;
GRANT ALL ON public.root_cause_actions TO service_role;
ALTER TABLE public.root_cause_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages rca actions" ON public.root_cause_actions FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========== tobe_change_log ==========
CREATE TABLE public.tobe_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tobe_process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  change_type public.tobe_change_type NOT NULL,
  target_ref text NOT NULL DEFAULT '',
  problem_addressed text NOT NULL DEFAULT '',
  expected_benefit text NOT NULL DEFAULT '',
  opportunity_id uuid REFERENCES public.improvement_opportunities(id) ON DELETE SET NULL,
  indicator_id uuid REFERENCES public.indicators(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tobe_change_log TO authenticated;
GRANT ALL ON public.tobe_change_log TO service_role;
ALTER TABLE public.tobe_change_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages tobe log" ON public.tobe_change_log FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========== roadmap_items ==========
CREATE TABLE public.roadmap_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  opportunity_id uuid REFERENCES public.improvement_opportunities(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  horizon public.roadmap_horizon NOT NULL DEFAULT 'curto',
  theme text NOT NULL DEFAULT '',
  area text NOT NULL DEFAULT '',
  responsible text NOT NULL DEFAULT '',
  deadline date,
  priority public.opportunity_priority NOT NULL DEFAULT 'media',
  effort public.effort_level NOT NULL DEFAULT 'medio',
  expected_impact text NOT NULL DEFAULT '',
  status public.roadmap_status NOT NULL DEFAULT 'planejado',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_items TO authenticated;
GRANT ALL ON public.roadmap_items TO service_role;
ALTER TABLE public.roadmap_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages roadmap" ON public.roadmap_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_road_updated BEFORE UPDATE ON public.roadmap_items FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== executive_diagnostics ==========
CREATE TABLE public.executive_diagnostics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Diagnóstico Executivo',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  edited_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.executive_diagnostics TO authenticated;
GRANT ALL ON public.executive_diagnostics TO service_role;
ALTER TABLE public.executive_diagnostics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages diagnostics" ON public.executive_diagnostics FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_diag_updated BEFORE UPDATE ON public.executive_diagnostics FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ========== EXTEND action_plans ==========
ALTER TABLE public.action_plans
  ADD COLUMN opportunity_id uuid REFERENCES public.improvement_opportunities(id) ON DELETE SET NULL,
  ADD COLUMN root_cause_id uuid REFERENCES public.root_cause_analyses(id) ON DELETE SET NULL,
  ADD COLUMN expected_benefit text NOT NULL DEFAULT '';

ALTER TABLE public.improvement_opportunities
  ADD CONSTRAINT improvement_opportunities_action_plan_fk
  FOREIGN KEY (action_plan_id) REFERENCES public.action_plans(id) ON DELETE SET NULL;
