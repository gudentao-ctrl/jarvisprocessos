CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  period_start date,
  period_end date,
  hourly_rate numeric NOT NULL DEFAULT 0,
  hours_total numeric NOT NULL DEFAULT 0,
  hours_amount numeric NOT NULL DEFAULT 0,
  expenses_amount numeric NOT NULL DEFAULT 0,
  tools_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'faturado',
  notes text NOT NULL DEFAULT '',
  invoiced_at timestamptz NOT NULL DEFAULT now(),
  invoiced_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_company_scoped ON public.invoices FOR ALL TO authenticated
  USING (private.is_superadmin() OR private.has_company_access(company_id))
  WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id));
CREATE TRIGGER invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  work_hour_id uuid REFERENCES public.work_hours(id) ON DELETE SET NULL,
  description text NOT NULL DEFAULT '',
  hours numeric NOT NULL DEFAULT 0,
  hours_amount numeric NOT NULL DEFAULT 0,
  expenses_amount numeric NOT NULL DEFAULT 0,
  tools_amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoice_items_company_scoped ON public.invoice_items FOR ALL TO authenticated
  USING (private.is_superadmin() OR private.has_company_access(company_id))
  WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id));

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  paid_at date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'pix',
  reference text NOT NULL DEFAULT '',
  notes text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_company_scoped ON public.payments FOR ALL TO authenticated
  USING (private.is_superadmin() OR private.has_company_access(company_id))
  WITH CHECK (private.is_superadmin() OR private.has_company_access(company_id));
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.work_hours ADD COLUMN IF NOT EXISTS invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_company ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_company ON public.payments(company_id);
CREATE INDEX IF NOT EXISTS idx_work_hours_invoice ON public.work_hours(invoice_id);