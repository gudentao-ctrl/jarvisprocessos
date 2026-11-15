CREATE TABLE public.meeting_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  meeting_date date NOT NULL DEFAULT current_date,
  participants text NOT NULL DEFAULT '' CHECK (char_length(participants) <= 1000),
  duration_sec integer NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  transcript text NOT NULL DEFAULT '' CHECK (char_length(transcript) <= 2000000),
  report jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(report) = 'object' AND pg_column_size(report) <= 1000000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','transcribed','reported')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX meeting_records_user_idx ON public.meeting_records (user_id, meeting_date DESC);
REVOKE ALL ON public.meeting_records FROM PUBLIC, anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.meeting_records TO authenticated;
GRANT ALL ON public.meeting_records TO service_role;
ALTER TABLE public.meeting_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY meeting_records_owner_select ON public.meeting_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY meeting_records_owner_insert ON public.meeting_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY meeting_records_owner_update ON public.meeting_records FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY meeting_records_owner_delete ON public.meeting_records FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER meeting_records_updated_at BEFORE UPDATE ON public.meeting_records FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

UPDATE public.user_company_permissions
SET permissions = jsonb_set(jsonb_set(permissions, '{sub_modules,registro_reuniao}', 'true'::jsonb, true),
  '{actions,registro_reuniao}', '{"read":true,"create":true,"update":true,"delete":true}'::jsonb, true)
WHERE role IN ('CONSULTOR','GESTOR','SUPERADMIN') AND permissions->>'version' = '1';