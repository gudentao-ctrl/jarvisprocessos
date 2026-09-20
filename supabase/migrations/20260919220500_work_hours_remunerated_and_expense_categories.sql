-- Bloco 2: Lançamento de Horas - Hora Remunerada e Categorias de Despesas

ALTER TABLE public.work_hours
  ADD COLUMN IF NOT EXISTS is_remunerated boolean NOT NULL DEFAULT true;

ALTER TABLE public.work_hour_expenses
  ADD COLUMN IF NOT EXISTS category text;
