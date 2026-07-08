
-- 4.1: Extend process_activities with richer fields (additive, non-destructive)
ALTER TABLE public.process_activities
  ADD COLUMN IF NOT EXISTS documents text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS inputs text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS outputs text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS problems text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS improvements text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS interview_snippet text NOT NULL DEFAULT '';

-- activity_connections: richer edges (sequential | decision | parallel | return | subprocess)
CREATE TABLE IF NOT EXISTS public.activity_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  from_activity_id uuid NOT NULL REFERENCES public.process_activities(id) ON DELETE CASCADE,
  to_activity_id uuid NOT NULL REFERENCES public.process_activities(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'sequential' CHECK (type IN ('sequential','decision','parallel','return','subprocess')),
  label text NOT NULL DEFAULT '',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_connections TO authenticated;
GRANT ALL ON public.activity_connections TO service_role;
ALTER TABLE public.activity_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages activity_connections" ON public.activity_connections
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS activity_connections_process_idx ON public.activity_connections(process_id);
CREATE INDEX IF NOT EXISTS activity_connections_from_idx ON public.activity_connections(from_activity_id);
CREATE INDEX IF NOT EXISTS activity_connections_to_idx ON public.activity_connections(to_activity_id);
CREATE TRIGGER set_activity_connections_updated
  BEFORE UPDATE ON public.activity_connections
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- process_decisions: question for decision-type activities
CREATE TABLE IF NOT EXISTS public.process_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL UNIQUE REFERENCES public.process_activities(id) ON DELETE CASCADE,
  question text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_decisions TO authenticated;
GRANT ALL ON public.process_decisions TO service_role;
ALTER TABLE public.process_decisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages process_decisions" ON public.process_decisions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_process_decisions_updated
  BEFORE UPDATE ON public.process_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- activity_links: optional cross-links (indicators / cronoanalysis / action plans)
CREATE TABLE IF NOT EXISTS public.activity_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.process_activities(id) ON DELETE CASCADE,
  link_type text NOT NULL CHECK (link_type IN ('indicator','cronoanalysis','action_plan')),
  target_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (activity_id, link_type, target_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_links TO authenticated;
GRANT ALL ON public.activity_links TO service_role;
ALTER TABLE public.activity_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages activity_links" ON public.activity_links
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS activity_links_activity_idx ON public.activity_links(activity_id);
CREATE INDEX IF NOT EXISTS activity_links_target_idx ON public.activity_links(link_type, target_id);

-- document_templates: unified doc branding per company
CREATE TABLE IF NOT EXISTS public.document_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Padrão',
  consultancy_logo_url text,
  client_logo_url text,
  header_html text NOT NULL DEFAULT '',
  footer_html text NOT NULL DEFAULT '',
  primary_color text NOT NULL DEFAULT '#0f172a',
  accent_color text NOT NULL DEFAULT '#2563eb',
  font_family text NOT NULL DEFAULT 'Inter',
  code_prefix text NOT NULL DEFAULT 'DOC',
  numbering_seed integer NOT NULL DEFAULT 1,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_templates TO authenticated;
GRANT ALL ON public.document_templates TO service_role;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team manages document_templates" ON public.document_templates
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER set_document_templates_updated
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Backfill: migrate existing process_edges into activity_connections as 'sequential'
INSERT INTO public.activity_connections (process_id, from_activity_id, to_activity_id, type, label, order_index)
SELECT e.process_id, e.source_id, e.target_id, 'sequential', COALESCE(e.label, ''), 0
FROM public.process_edges e
WHERE NOT EXISTS (
  SELECT 1 FROM public.activity_connections c
  WHERE c.process_id = e.process_id
    AND c.from_activity_id = e.source_id
    AND c.to_activity_id = e.target_id
);
