CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL DEFAULT '',
  contact_role text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  first_contact_date date,
  responsible text NOT NULL DEFAULT '',
  stage text NOT NULL DEFAULT 'nao_iniciado',
  is_hot boolean NOT NULL DEFAULT false,
  last_contact_at date,
  next_action_date date,
  converted_company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  converted_at timestamptz,
  contract_type text,
  payment_day integer,
  hourly_rate numeric,
  contract_total numeric,
  start_date date,
  end_date date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_leads TO authenticated;
GRANT ALL ON public.crm_leads TO service_role;
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_leads_team" ON public.crm_leads FOR ALL TO authenticated
  USING (private.is_team_member()) WITH CHECK (private.is_team_member());
CREATE TRIGGER crm_leads_updated_at BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'contato',
  description text NOT NULL DEFAULT '',
  occurred_at date NOT NULL DEFAULT current_date,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
GRANT ALL ON public.crm_activities TO service_role;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crm_activities_team" ON public.crm_activities FOR ALL TO authenticated
  USING (private.is_team_member()) WITH CHECK (private.is_team_member());

CREATE INDEX crm_activities_lead_idx ON public.crm_activities(lead_id);

CREATE TABLE public.alert_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  alert_key text NOT NULL,
  dismissed_on date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, alert_key, dismissed_on)
);

GRANT SELECT, INSERT, DELETE ON public.alert_dismissals TO authenticated;
GRANT ALL ON public.alert_dismissals TO service_role;
ALTER TABLE public.alert_dismissals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "alert_dismissals_own" ON public.alert_dismissals FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());