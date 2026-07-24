
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS public_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS public_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_title TEXT,
  ADD COLUMN IF NOT EXISTS public_company_logo_url TEXT,
  ADD COLUMN IF NOT EXISTS public_consultancy_logo_url TEXT;

CREATE OR REPLACE FUNCTION public.companies_autofill_token()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_autofill_token ON public.companies;
CREATE TRIGGER trg_companies_autofill_token
  BEFORE INSERT ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.companies_autofill_token();

-- Backfill existing companies
UPDATE public.companies
SET public_token = replace(replace(replace(encode(extensions.gen_random_bytes(18), 'base64'), '+', '-'), '/', '_'), '=', '')
WHERE public_token IS NULL;
