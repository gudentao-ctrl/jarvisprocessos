ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cpf text,
  ADD COLUMN IF NOT EXISTS birth_date date,
  ADD COLUMN IF NOT EXISTS whatsapp text;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_cpf_unique
  ON public.profiles (cpf)
  WHERE cpf IS NOT NULL AND btrim(cpf) <> '';

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name text;
  v_cpf text;
  v_birth_date date;
  v_whatsapp text;
BEGIN
  v_full_name := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1));
  v_cpf := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''), '[^0-9]', '', 'g'), '');
  v_whatsapp := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', ''), '[^0-9+]', '', 'g'), '');
  BEGIN
    v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    v_birth_date := NULL;
  END;

  INSERT INTO public.profiles (user_id, email, full_name, cpf, birth_date, whatsapp, is_superadmin, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_cpf,
    v_birth_date,
    v_whatsapp,
    false,
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
    whatsapp = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'member')
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;