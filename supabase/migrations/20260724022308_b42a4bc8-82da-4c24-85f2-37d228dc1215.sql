
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS public_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS public_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_title text,
  ADD COLUMN IF NOT EXISTS public_company_logo_url text,
  ADD COLUMN IF NOT EXISTS public_consultancy_logo_url text;

CREATE OR REPLACE FUNCTION public.companies_autofill_token()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public','extensions'
AS $$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS companies_autofill_token_trg ON public.companies;
CREATE TRIGGER companies_autofill_token_trg
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_autofill_token();

-- Popula tokens em empresas existentes
UPDATE public.companies
SET public_token = replace(replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE public_token IS NULL;
