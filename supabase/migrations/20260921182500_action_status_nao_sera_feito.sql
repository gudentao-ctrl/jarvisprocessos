-- Migration para adicionar o status 'nao_sera_feito' ao enum action_status
DO $$
BEGIN
  ALTER TYPE public.action_status ADD VALUE IF NOT EXISTS 'nao_sera_feito';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
