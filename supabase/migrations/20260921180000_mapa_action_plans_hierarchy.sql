-- Migration para suporte à hierarquia e mapa estratégico em action_plans
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.action_plans(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS item_type text DEFAULT 'acao',
  ADD COLUMN IF NOT EXISTS progress_pct integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS order_index integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS custom_pillar text;

CREATE INDEX IF NOT EXISTS action_plans_parent_id_idx ON public.action_plans(parent_id);
CREATE INDEX IF NOT EXISTS action_plans_company_parent_idx ON public.action_plans(company_id, parent_id);
