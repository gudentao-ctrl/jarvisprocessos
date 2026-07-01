-- Refatoração JARVIS: migrações puramente aditivas (não destrutivas)

-- 1. Compartilhamento público de Planos
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE;

-- 2. Tipo de reunião nas entrevistas (para calendário unificado)
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS meeting_type TEXT;

-- 3. Vínculo N:N Indicadores ↔ Processos (mantém process_id legado)
ALTER TABLE public.indicators
  ADD COLUMN IF NOT EXISTS process_ids UUID[] DEFAULT '{}'::UUID[];

-- 4. Vínculo N:N Planos ↔ Processos
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS process_ids UUID[] DEFAULT '{}'::UUID[];

-- 5. Enriquecimento do Mapa de Informação
ALTER TABLE public.process_information_map
  ADD COLUMN IF NOT EXISTS system TEXT,
  ADD COLUMN IF NOT EXISTS periodicity TEXT,
  ADD COLUMN IF NOT EXISTS is_automated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_digital BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS has_rework BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS time_minutes NUMERIC(8,2);

-- 6. Enriquecimento do Mapa de Decisão
ALTER TABLE public.process_decision_map
  ADD COLUMN IF NOT EXISTS financial_impact NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS frequency TEXT,
  ADD COLUMN IF NOT EXISTS criteria TEXT,
  ADD COLUMN IF NOT EXISTS data_used TEXT;

-- 7. Auto-gerar public_token para planos ao inserir
CREATE OR REPLACE FUNCTION public.action_plans_autofill()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_action_plans_autofill ON public.action_plans;
CREATE TRIGGER trg_action_plans_autofill
  BEFORE INSERT ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.action_plans_autofill();

-- 8. Backfill de tokens em planos existentes
UPDATE public.action_plans
SET public_token = replace(replace(replace(encode(gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE public_token IS NULL;