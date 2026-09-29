ALTER TYPE public.opportunity_status ADD VALUE IF NOT EXISTS 'em_analise' AFTER 'sugerida';

ALTER TABLE public.improvement_opportunities
  ADD COLUMN IF NOT EXISTS source_bucket text,
  ADD COLUMN IF NOT EXISTS source_item_id uuid;

ALTER TABLE public.improvement_opportunities
  DROP CONSTRAINT IF EXISTS improvement_opportunities_source_bucket_check;
ALTER TABLE public.improvement_opportunities
  ADD CONSTRAINT improvement_opportunities_source_bucket_check
  CHECK (source_bucket IS NULL OR source_bucket IN ('pain','decision','information'));

CREATE UNIQUE INDEX IF NOT EXISTS improvement_opportunities_source_item_unique
  ON public.improvement_opportunities(source_bucket, source_item_id)
  WHERE source_bucket IS NOT NULL AND source_item_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS improvement_opportunities_company_status_idx
  ON public.improvement_opportunities(company_id, status);