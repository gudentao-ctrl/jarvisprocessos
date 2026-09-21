ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL;

ALTER TABLE public.improvement_opportunities
  ADD COLUMN IF NOT EXISTS sector_id uuid REFERENCES public.sectors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sector text;

UPDATE public.action_plans ap
SET sector_id = s.id
FROM public.sectors s
WHERE ap.sector_id IS NULL
  AND ap.company_id = s.company_id
  AND NULLIF(btrim(ap.sector), '') IS NOT NULL
  AND lower(btrim(ap.sector)) = lower(btrim(s.name));

UPDATE public.improvement_opportunities io
SET sector_id = s.id
FROM public.sectors s
WHERE io.sector_id IS NULL
  AND io.company_id = s.company_id
  AND NULLIF(btrim(io.sector), '') IS NOT NULL
  AND lower(btrim(io.sector)) = lower(btrim(s.name));

CREATE INDEX IF NOT EXISTS action_plans_sector_id_idx ON public.action_plans(sector_id);
CREATE INDEX IF NOT EXISTS improvement_opportunities_sector_id_idx ON public.improvement_opportunities(sector_id);