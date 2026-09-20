-- Bloco 1: Agenda - Google Calendar, locais pré-salvos e campos de convite

-- 1. Tabela de locais pré-salvos
CREATE TABLE IF NOT EXISTS public.calendar_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, DELETE ON public.calendar_locations TO authenticated;
GRANT ALL ON public.calendar_locations TO service_role;

ALTER TABLE public.calendar_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all team can see locations" ON public.calendar_locations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert locations" ON public.calendar_locations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "owner or superadmin can delete locations" ON public.calendar_locations
  FOR DELETE TO authenticated USING (
    created_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND is_superadmin = true)
  );

-- Locais padrão iniciais
INSERT INTO public.calendar_locations (name) VALUES
  ('Maia'),
  ('PO Londrina'),
  ('Iluminação'),
  ('Prefeitura')
ON CONFLICT DO NOTHING;

-- 2. Novas colunas em calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_internal_invite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_event_id text;

-- 3. Tabela de tokens Google Calendar por usuário
CREATE TABLE IF NOT EXISTS public.user_google_calendar_tokens (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  expiry_date bigint,
  google_email text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_google_calendar_tokens TO authenticated;
GRANT ALL ON public.user_google_calendar_tokens TO service_role;

ALTER TABLE public.user_google_calendar_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users manage own google token" ON public.user_google_calendar_tokens
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER user_google_calendar_tokens_updated_at
  BEFORE UPDATE ON public.user_google_calendar_tokens
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
