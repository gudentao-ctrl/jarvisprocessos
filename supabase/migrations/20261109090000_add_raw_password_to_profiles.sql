-- Migration: add raw_password to profiles and update handle_new_user trigger
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS raw_password text;

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
  v_raw_password text;
BEGIN
  v_full_name := COALESCE(NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''), split_part(NEW.email, '@', 1));
  v_cpf := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'cpf', ''), '[^0-9]', '', 'g'), '');
  v_whatsapp := NULLIF(regexp_replace(COALESCE(NEW.raw_user_meta_data ->> 'whatsapp', ''), '[^0-9+]', '', 'g'), '');
  v_raw_password := NULLIF(NEW.raw_user_meta_data ->> 'raw_password', '');
  BEGIN
    v_birth_date := NULLIF(NEW.raw_user_meta_data ->> 'birth_date', '')::date;
  EXCEPTION WHEN invalid_datetime_format OR datetime_field_overflow THEN
    v_birth_date := NULL;
  END;

  INSERT INTO public.profiles (user_id, email, full_name, cpf, birth_date, whatsapp, raw_password, is_superadmin, status)
  VALUES (
    NEW.id,
    NEW.email,
    v_full_name,
    v_cpf,
    v_birth_date,
    v_whatsapp,
    v_raw_password,
    false,
    'pending'
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    cpf = COALESCE(EXCLUDED.cpf, public.profiles.cpf),
    birth_date = COALESCE(EXCLUDED.birth_date, public.profiles.birth_date),
    whatsapp = COALESCE(EXCLUDED.whatsapp, public.profiles.whatsapp),
    raw_password = COALESCE(EXCLUDED.raw_password, public.profiles.raw_password),
    updated_at = now();

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente')
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;
