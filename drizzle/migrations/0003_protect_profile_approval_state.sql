CREATE OR REPLACE FUNCTION public.protect_profile_approval_state() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT private.is_superadmin() AND (
    NEW.status IS DISTINCT FROM OLD.status OR NEW.is_superadmin IS DISTINCT FROM OLD.is_superadmin OR NEW.user_id IS DISTINCT FROM OLD.user_id
  ) THEN RAISE EXCEPTION 'Somente o SuperAdmin pode alterar aprovação e privilégios'; END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_approval_state() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER protect_profile_approval_state BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.protect_profile_approval_state();