-- Bloco 5: Melhorias no funil de CRM
-- Adiciona: origem como enum text, quem_indicou, classification (quente/medio/frio),
-- cnpj, whatsapp, total_project_hours, payment_due_date (caso não exista)

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS origem text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS quem_indicou text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS classification text NOT NULL DEFAULT 'frio',
  ADD COLUMN IF NOT EXISTS cnpj text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS total_project_hours numeric,
  ADD COLUMN IF NOT EXISTS payment_due_date date;

NOTIFY pgrst, 'reload schema';
