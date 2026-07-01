
-- 1. Redefine v_indicator_status to consider indicator's own frequency vs created_at when no collection exists
CREATE OR REPLACE VIEW public.v_indicator_status AS
WITH freq AS (
  SELECT id,
    CASE lower(trim(coalesce(frequency,'')))
      WHEN 'diario' THEN interval '1 day'
      WHEN 'diaria' THEN interval '1 day'
      WHEN 'daily'  THEN interval '1 day'
      WHEN 'semanal' THEN interval '7 days'
      WHEN 'weekly'  THEN interval '7 days'
      WHEN 'quinzenal' THEN interval '15 days'
      WHEN 'mensal' THEN interval '30 days'
      WHEN 'monthly' THEN interval '30 days'
      WHEN 'trimestral' THEN interval '90 days'
      WHEN 'quarterly' THEN interval '90 days'
      ELSE NULL
    END AS period
  FROM public.indicators
)
SELECT i.id, i.name, i.code, i.unit, i.target, i.critical_min, i.critical_max, i.frequency,
       i.project_id, i.company_id, i.process_id, i.public_token, i.responsible_name,
       lc.last_value, lc.last_at, lc.last_evaluation,
       (lc.last_at + f.period) AS next_due_at,
       CASE
         WHEN lc.last_at IS NULL AND f.period IS NOT NULL AND now() > (i.created_at + f.period) THEN 'atrasado'
         WHEN lc.last_at IS NULL THEN 'sem_coleta'
         WHEN lc.last_evaluation = 'critico' THEN 'critico'
         WHEN f.period IS NOT NULL AND now() > (lc.last_at + f.period) THEN 'atrasado'
         WHEN lc.last_evaluation = 'abaixo_meta' THEN 'abaixo_meta'
         ELSE 'ok'
       END AS status
FROM public.indicators i
LEFT JOIN freq f ON f.id = i.id
LEFT JOIN LATERAL (
  SELECT ic.value AS last_value, ic.submitted_at AS last_at, ic.evaluation AS last_evaluation
  FROM public.indicator_collections ic
  WHERE ic.indicator_id = i.id
  ORDER BY ic.submitted_at DESC LIMIT 1
) lc ON true;

GRANT SELECT ON public.v_indicator_status TO authenticated;
GRANT SELECT ON public.v_indicator_status TO service_role;

-- 2. New table: work_hours
CREATE TABLE IF NOT EXISTS public.work_hours (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  responsible text NOT NULL DEFAULT '',
  activity_type text NOT NULL DEFAULT 'consultoria',
  work_date date NOT NULL DEFAULT current_date,
  hours numeric(5,2) NOT NULL DEFAULT 0,
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_work_hours_project_date ON public.work_hours(project_id, work_date DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_hours TO authenticated;
GRANT ALL ON public.work_hours TO service_role;

ALTER TABLE public.work_hours ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team_read_work_hours" ON public.work_hours FOR SELECT TO authenticated USING (true);
CREATE POLICY "team_write_work_hours" ON public.work_hours FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "team_update_work_hours" ON public.work_hours FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "team_delete_work_hours" ON public.work_hours FOR DELETE TO authenticated USING (true);

CREATE TRIGGER trg_work_hours_updated_at
  BEFORE UPDATE ON public.work_hours
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
