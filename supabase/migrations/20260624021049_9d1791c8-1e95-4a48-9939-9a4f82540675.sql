
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS code TEXT,
  ADD COLUMN IF NOT EXISTS public_token TEXT,
  ADD COLUMN IF NOT EXISTS critical_min NUMERIC,
  ADD COLUMN IF NOT EXISTS critical_max NUMERIC,
  ADD COLUMN IF NOT EXISTS responsible_name TEXT,
  ADD COLUMN IF NOT EXISTS responsible_email TEXT,
  ADD COLUMN IF NOT EXISTS instructions TEXT,
  ADD COLUMN IF NOT EXISTS direction TEXT NOT NULL DEFAULT 'higher_better';

UPDATE public.indicators
SET public_token = replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE public_token IS NULL;

WITH ranked AS (
  SELECT i.id,
         upper(regexp_replace(coalesce(c.name, 'EMP'), '\W+', '', 'g')) AS c_name,
         upper(regexp_replace(coalesce(p.name, 'PROC'), '\W+', '', 'g')) AS p_name,
         row_number() OVER (PARTITION BY i.company_id ORDER BY i.created_at) AS seq
  FROM public.indicators i
  LEFT JOIN public.companies c ON c.id = i.company_id
  LEFT JOIN public.processes p ON p.id = i.process_id
  WHERE i.code IS NULL
)
UPDATE public.indicators i
SET code = ranked.c_name || '-' || ranked.p_name || '-IND-' || lpad(ranked.seq::text, 4, '0')
FROM ranked
WHERE ranked.id = i.id;

CREATE UNIQUE INDEX IF NOT EXISTS indicators_public_token_uniq ON public.indicators(public_token);
CREATE UNIQUE INDEX IF NOT EXISTS indicators_code_uniq ON public.indicators(code) WHERE code IS NOT NULL;

CREATE OR REPLACE FUNCTION public.indicators_autofill()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  c_name TEXT;
  p_name TEXT;
  seq INT;
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT upper(regexp_replace(coalesce(name, 'EMP'), '\W+', '', 'g')) INTO c_name
      FROM public.companies WHERE id = NEW.company_id;
    SELECT upper(regexp_replace(coalesce(name, 'PROC'), '\W+', '', 'g')) INTO p_name
      FROM public.processes WHERE id = NEW.process_id;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '.*-IND-', ''), '')::int), 0) + 1 INTO seq
      FROM public.indicators
      WHERE company_id = NEW.company_id AND code LIKE '%-IND-%';
    NEW.code := COALESCE(c_name, 'EMP') || '-' || COALESCE(p_name, 'PROC') || '-IND-' || lpad(seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS indicators_autofill_trg ON public.indicators;
CREATE TRIGGER indicators_autofill_trg
  BEFORE INSERT ON public.indicators
  FOR EACH ROW EXECUTE FUNCTION public.indicators_autofill();

CREATE TABLE IF NOT EXISTS public.indicator_collections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  indicator_id UUID NOT NULL REFERENCES public.indicators(id) ON DELETE CASCADE,
  value NUMERIC NOT NULL,
  reference_period TEXT,
  observation TEXT DEFAULT '',
  submitted_by_name TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_hash TEXT,
  evaluation TEXT NOT NULL DEFAULT 'ok',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS indicator_collections_indicator_idx
  ON public.indicator_collections(indicator_id, submitted_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.indicator_collections TO authenticated;
GRANT ALL ON public.indicator_collections TO service_role;

ALTER TABLE public.indicator_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "team manages collections" ON public.indicator_collections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.evaluate_collection()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  ind RECORD;
BEGIN
  SELECT target, critical_min, critical_max, direction INTO ind
    FROM public.indicators WHERE id = NEW.indicator_id;

  NEW.evaluation := 'ok';

  IF ind.critical_min IS NOT NULL AND NEW.value < ind.critical_min THEN
    NEW.evaluation := 'critico';
  ELSIF ind.critical_max IS NOT NULL AND NEW.value > ind.critical_max THEN
    NEW.evaluation := 'critico';
  ELSIF ind.target IS NOT NULL THEN
    IF ind.direction = 'lower_better' AND NEW.value > ind.target THEN
      NEW.evaluation := 'abaixo_meta';
    ELSIF ind.direction = 'higher_better' AND NEW.value < ind.target THEN
      NEW.evaluation := 'abaixo_meta';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS evaluate_collection_trg ON public.indicator_collections;
CREATE TRIGGER evaluate_collection_trg
  BEFORE INSERT OR UPDATE ON public.indicator_collections
  FOR EACH ROW EXECUTE FUNCTION public.evaluate_collection();

CREATE OR REPLACE VIEW public.v_indicator_status AS
SELECT
  i.id, i.name, i.code, i.unit, i.target, i.critical_min, i.critical_max,
  i.frequency, i.project_id, i.company_id, i.process_id, i.public_token, i.responsible_name,
  lc.last_value, lc.last_at, lc.last_evaluation,
  CASE i.frequency
    WHEN 'diario'     THEN lc.last_at + INTERVAL '1 day'
    WHEN 'semanal'    THEN lc.last_at + INTERVAL '7 days'
    WHEN 'quinzenal'  THEN lc.last_at + INTERVAL '15 days'
    WHEN 'mensal'     THEN lc.last_at + INTERVAL '30 days'
    WHEN 'trimestral' THEN lc.last_at + INTERVAL '90 days'
    ELSE NULL
  END AS next_due_at,
  CASE
    WHEN lc.last_at IS NULL THEN 'sem_coleta'
    WHEN lc.last_evaluation = 'critico' THEN 'critico'
    WHEN i.frequency = 'diario'    AND now() > lc.last_at + INTERVAL '1 day'   THEN 'atrasado'
    WHEN i.frequency = 'semanal'   AND now() > lc.last_at + INTERVAL '7 days'  THEN 'atrasado'
    WHEN i.frequency = 'quinzenal' AND now() > lc.last_at + INTERVAL '15 days' THEN 'atrasado'
    WHEN i.frequency = 'mensal'    AND now() > lc.last_at + INTERVAL '30 days' THEN 'atrasado'
    WHEN i.frequency = 'trimestral' AND now() > lc.last_at + INTERVAL '90 days' THEN 'atrasado'
    WHEN lc.last_evaluation = 'abaixo_meta' THEN 'abaixo_meta'
    ELSE 'ok'
  END AS status
FROM public.indicators i
LEFT JOIN LATERAL (
  SELECT value AS last_value, submitted_at AS last_at, evaluation AS last_evaluation
  FROM public.indicator_collections
  WHERE indicator_id = i.id
  ORDER BY submitted_at DESC
  LIMIT 1
) lc ON true;

GRANT SELECT ON public.v_indicator_status TO authenticated;
GRANT ALL ON public.v_indicator_status TO service_role;
