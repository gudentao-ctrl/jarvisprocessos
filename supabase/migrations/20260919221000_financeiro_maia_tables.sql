-- Bloco 4: FINANCEIRO MAIA (Auditoria, DRE, Conta Corrente e Impostos)

-- 1. Tabela de Configuração de Impostos
CREATE TABLE IF NOT EXISTS public.maia_tax_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  rate_percent numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maia_tax_settings TO authenticated;
GRANT ALL ON public.maia_tax_settings TO service_role;
ALTER TABLE public.maia_tax_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin or manager can manage maia_tax_settings" ON public.maia_tax_settings
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- Impostos padrão iniciais
INSERT INTO public.maia_tax_settings (name, rate_percent) VALUES
  ('Simples Nacional / ISS', 6.00)
ON CONFLICT DO NOTHING;

-- 2. Tabela de Contratos de Consultores (Sigiloso - Restrito a Gestor/Superadmin)
CREATE TABLE IF NOT EXISTS public.consultant_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_regime text NOT NULL DEFAULT 'hora', -- 'fixo', 'hora', 'conta_corrente'
  monthly_fixed_amount numeric NOT NULL DEFAULT 0,
  hourly_rate numeric NOT NULL DEFAULT 0,
  base_floor_amount numeric NOT NULL DEFAULT 0, -- Piso (R$)
  min_hours numeric NOT NULL DEFAULT 0, -- Horas Mínimas
  extra_hour_rate numeric NOT NULL DEFAULT 0, -- Valor Hora Extra (R$)
  active boolean NOT NULL DEFAULT true,
  notes text DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultant_contracts_user_id_key UNIQUE (user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_contracts TO authenticated;
GRANT ALL ON public.consultant_contracts TO service_role;
ALTER TABLE public.consultant_contracts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin or manager only consultant_contracts" ON public.consultant_contracts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 3. Tabela de Fechamentos Mensais da Equipe (Snapshot Imutável)
CREATE TABLE IF NOT EXISTS public.consultant_closings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month_year text NOT NULL, -- Ex: '2026-09'
  payment_regime_snapshot text NOT NULL,
  contract_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  total_hours numeric NOT NULL DEFAULT 0,
  min_hours_snapshot numeric NOT NULL DEFAULT 0,
  deficit_hours numeric NOT NULL DEFAULT 0,
  base_amount numeric NOT NULL DEFAULT 0,
  extra_amount numeric NOT NULL DEFAULT 0,
  expense_reimbursement numeric NOT NULL DEFAULT 0,
  total_payable numeric NOT NULL DEFAULT 0,
  nf_received boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'aberto', -- 'aberto', 'aprovado', 'pago'
  closed_by uuid REFERENCES auth.users(id),
  closed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT consultant_closings_user_month_key UNIQUE (user_id, month_year)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_closings TO authenticated;
GRANT ALL ON public.consultant_closings TO service_role;
ALTER TABLE public.consultant_closings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "managers can manage closings and consultants see own" ON public.consultant_closings
  FOR ALL TO authenticated
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 4. Tabela de Conta Corrente e Banco de Horas dos Consultores
CREATE TABLE IF NOT EXISTS public.consultant_current_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance_hours numeric NOT NULL DEFAULT 0,
  debt_installments_requested boolean NOT NULL DEFAULT false,
  debt_installments_count int NOT NULL DEFAULT 1,
  debt_installments_status text NOT NULL DEFAULT 'none', -- 'none', 'solicitado', 'aprovado', 'rejeitado'
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_current_accounts TO authenticated;
GRANT ALL ON public.consultant_current_accounts TO service_role;
ALTER TABLE public.consultant_current_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "current accounts access" ON public.consultant_current_accounts
  FOR ALL TO authenticated
  USING (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (user_id = auth.uid()
     OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 5. Tabela de Entradas de DRE (Custos Fixos e Variáveis Corporativos da Maia)
CREATE TABLE IF NOT EXISTS public.maia_dre_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month_year text NOT NULL, -- Ex: '2026-09'
  entry_type text NOT NULL, -- 'custo_fixo', 'custo_variavel'
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.maia_dre_entries TO authenticated;
GRANT ALL ON public.maia_dre_entries TO service_role;
ALTER TABLE public.maia_dre_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin or manager can manage dre entries" ON public.maia_dre_entries
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
     OR EXISTS (SELECT 1 FROM public.company_members WHERE user_id = auth.uid() AND member_role = 'gestor'));

-- 6. Colunas de Auditoria e Ajuste da Gestão em work_hours
ALTER TABLE public.work_hours
  ADD COLUMN IF NOT EXISTS audit_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS adjusted_by_manager boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manager_note text DEFAULT '';
