-- DRE model per client, monthly DRE snapshots, maturity records and roadmap cockpit, all company-scoped.
CREATE TABLE IF NOT EXISTS public.torre_dre_templates (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(blocks) = 'array' AND pg_column_size(blocks) < 200000),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.torre_dre_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month_year text NOT NULL CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  mode text NOT NULL CHECK (mode IN ('realizado','orcado')),
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(blocks) = 'array' AND pg_column_size(blocks) < 200000),
  notes text CHECK (notes IS NULL OR length(notes) <= 5000),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, month_year, mode)
);
CREATE INDEX IF NOT EXISTS idx_torre_dre_records_company ON public.torre_dre_records(company_id, month_year);

CREATE TABLE IF NOT EXISTS public.torre_maturity_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  month_year text NOT NULL CHECK (month_year ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  answers jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(answers) = 'object' AND pg_column_size(answers) < 20000),
  notes text CHECK (notes IS NULL OR length(notes) <= 5000),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, month_year)
);

CREATE TABLE IF NOT EXISTS public.roadmap_cockpits (
  company_id uuid PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  data jsonb NOT NULL CHECK (jsonb_typeof(data) = 'object' AND pg_column_size(data) < 300000),
  updated_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.torre_dre_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torre_dre_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.torre_maturity_records TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.roadmap_cockpits TO authenticated;
GRANT ALL ON public.torre_dre_templates TO service_role;
GRANT ALL ON public.torre_dre_records TO service_role;
GRANT ALL ON public.torre_maturity_records TO service_role;
GRANT ALL ON public.roadmap_cockpits TO service_role;

ALTER TABLE public.torre_dre_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torre_dre_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.torre_maturity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roadmap_cockpits ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  spec text[];
  specs text[][] := ARRAY[
    ['torre_dre_templates','torre_controle'],
    ['torre_dre_records','torre_controle'],
    ['torre_maturity_records','torre_controle'],
    ['roadmap_cockpits','roadmap']
  ];
BEGIN
  FOREACH spec SLICE 1 IN ARRAY specs LOOP
    EXECUTE format('CREATE POLICY company_read ON public.%I FOR SELECT TO authenticated USING (public.has_company_permission(company_id, %L, ''read''))', spec[1], spec[2]);
    EXECUTE format('CREATE POLICY company_create ON public.%I FOR INSERT TO authenticated WITH CHECK (public.has_company_permission(company_id, %L, ''create''))', spec[1], spec[2]);
    EXECUTE format('CREATE POLICY company_update ON public.%I FOR UPDATE TO authenticated USING (public.has_company_permission(company_id, %L, ''update'')) WITH CHECK (public.has_company_permission(company_id, %L, ''update''))', spec[1], spec[2], spec[2]);
    EXECUTE format('CREATE POLICY company_delete ON public.%I FOR DELETE TO authenticated USING (public.has_company_permission(company_id, %L, ''delete''))', spec[1], spec[2]);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', spec[1]);
    EXECUTE format('CREATE TRIGGER jarvis_live_bell AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.ring_company_bell(%L)', spec[1], 'company_id');
  END LOOP;
END
$$;