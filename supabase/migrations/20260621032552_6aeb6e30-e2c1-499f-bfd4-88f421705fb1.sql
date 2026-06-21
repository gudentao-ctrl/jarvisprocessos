
-- Enums
CREATE TYPE public.process_level AS ENUM ('0','1','2');
CREATE TYPE public.activity_type AS ENUM ('start','task','decision','wait','approval','end','info_in','info_out');
CREATE TYPE public.pain_category AS ENUM ('processo','informacao','governanca','pessoas','tecnologia','planejamento','qualidade','producao','compras','logistica');
CREATE TYPE public.pain_source AS ENUM ('interview','process','cronoanalysis','manual');
CREATE TYPE public.va_class AS ENUM ('VA','NVA','NNVA');
CREATE TYPE public.action_status AS ENUM ('aberto','em_andamento','concluido');
CREATE TYPE public.action_priority AS ENUM ('baixa','media','alta','critica');

-- PROCESSES
CREATE TABLE public.processes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  parent_id uuid REFERENCES public.processes(id) ON DELETE CASCADE,
  level public.process_level NOT NULL DEFAULT '0',
  name text NOT NULL,
  description text DEFAULT '',
  objective text DEFAULT '',
  responsible text DEFAULT '',
  inputs text DEFAULT '',
  outputs text DEFAULT '',
  systems text[] NOT NULL DEFAULT '{}',
  source_interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.processes TO authenticated;
GRANT ALL ON public.processes TO service_role;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages processes" ON public.processes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_processes_updated BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROCESS ACTIVITIES
CREATE TABLE public.process_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  ordering int NOT NULL DEFAULT 0,
  type public.activity_type NOT NULL DEFAULT 'task',
  title text NOT NULL,
  description text DEFAULT '',
  responsible text DEFAULT '',
  area text DEFAULT '',
  systems text[] NOT NULL DEFAULT '{}',
  time_minutes numeric(10,2) DEFAULT 0,
  notes text DEFAULT '',
  x numeric DEFAULT 0,
  y numeric DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_activities TO authenticated;
GRANT ALL ON public.process_activities TO service_role;
ALTER TABLE public.process_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages activities" ON public.process_activities FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_activities_updated BEFORE UPDATE ON public.process_activities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PROCESS EDGES
CREATE TABLE public.process_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  source_id uuid NOT NULL REFERENCES public.process_activities(id) ON DELETE CASCADE,
  target_id uuid NOT NULL REFERENCES public.process_activities(id) ON DELETE CASCADE,
  label text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_edges TO authenticated;
GRANT ALL ON public.process_edges TO service_role;
ALTER TABLE public.process_edges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages edges" ON public.process_edges FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- INFORMATION MAP
CREATE TABLE public.process_information_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.process_activities(id) ON DELETE SET NULL,
  origin text DEFAULT '',
  destination text DEFAULT '',
  medium text DEFAULT '',
  responsible text DEFAULT '',
  document text DEFAULT '',
  loss_risk boolean DEFAULT false,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_information_map TO authenticated;
GRANT ALL ON public.process_information_map TO service_role;
ALTER TABLE public.process_information_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages info map" ON public.process_information_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- DECISION MAP
CREATE TABLE public.process_decision_map (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  activity_id uuid REFERENCES public.process_activities(id) ON DELETE SET NULL,
  decider text DEFAULT '',
  decision text DEFAULT '',
  approval_required boolean DEFAULT false,
  reported_delay text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_decision_map TO authenticated;
GRANT ALL ON public.process_decision_map TO service_role;
ALTER TABLE public.process_decision_map ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages decision map" ON public.process_decision_map FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- PAIN POINTS
CREATE TABLE public.pain_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  source public.pain_source NOT NULL DEFAULT 'manual',
  source_id uuid,
  category public.pain_category NOT NULL DEFAULT 'processo',
  description text NOT NULL,
  severity int NOT NULL DEFAULT 3,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pain_points TO authenticated;
GRANT ALL ON public.pain_points TO service_role;
ALTER TABLE public.pain_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages pains" ON public.pain_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_pain_updated BEFORE UPDATE ON public.pain_points FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- INDICATORS
CREATE TABLE public.indicators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text DEFAULT '',
  unit text DEFAULT '',
  target numeric,
  frequency text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicators TO authenticated;
GRANT ALL ON public.indicators TO service_role;
ALTER TABLE public.indicators ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages indicators" ON public.indicators FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_indicators_updated BEFORE UPDATE ON public.indicators FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CRONOANALYSIS SESSIONS
CREATE TABLE public.cronoanalysis_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  production_line text DEFAULT '',
  machine text DEFAULT '',
  product text DEFAULT '',
  observer text DEFAULT '',
  observation_date date NOT NULL DEFAULT CURRENT_DATE,
  takt_time numeric,
  notes text DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronoanalysis_sessions TO authenticated;
GRANT ALL ON public.cronoanalysis_sessions TO service_role;
ALTER TABLE public.cronoanalysis_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages cronoanalysis" ON public.cronoanalysis_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_crono_updated BEFORE UPDATE ON public.cronoanalysis_sessions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- CRONOANALYSIS OBSERVATIONS
CREATE TABLE public.cronoanalysis_observations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.cronoanalysis_sessions(id) ON DELETE CASCADE,
  ordering int NOT NULL DEFAULT 0,
  activity text NOT NULL,
  time_minutes numeric(10,2) NOT NULL DEFAULT 0,
  classification public.va_class NOT NULL DEFAULT 'VA',
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cronoanalysis_observations TO authenticated;
GRANT ALL ON public.cronoanalysis_observations TO service_role;
ALTER TABLE public.cronoanalysis_observations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages crono observations" ON public.cronoanalysis_observations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ACTION PLANS
CREATE TABLE public.action_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  process_id uuid REFERENCES public.processes(id) ON DELETE SET NULL,
  interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
  cronoanalysis_id uuid REFERENCES public.cronoanalysis_sessions(id) ON DELETE SET NULL,
  pain_point_id uuid REFERENCES public.pain_points(id) ON DELETE SET NULL,
  indicator_id uuid REFERENCES public.indicators(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text DEFAULT '',
  responsible text DEFAULT '',
  due_date date,
  status public.action_status NOT NULL DEFAULT 'aberto',
  priority public.action_priority NOT NULL DEFAULT 'media',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.action_plans TO authenticated;
GRANT ALL ON public.action_plans TO service_role;
ALTER TABLE public.action_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages action plans" ON public.action_plans FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_actions_updated BEFORE UPDATE ON public.action_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
