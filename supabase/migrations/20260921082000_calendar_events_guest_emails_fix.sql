-- Migration para garantir as colunas de convidados e integração Google no calendar_events
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_internal_invite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_event_id text;

-- Garantir tabela calendar_locations
CREATE TABLE IF NOT EXISTS public.calendar_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now() NOT NULL
);

GRANT SELECT, INSERT, DELETE ON public.calendar_locations TO authenticated;
GRANT ALL ON public.calendar_locations TO service_role;

ALTER TABLE public.calendar_locations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calendar_locations' AND policyname = 'all team can see locations'
  ) THEN
    CREATE POLICY "all team can see locations" ON public.calendar_locations
      FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'calendar_locations' AND policyname = 'authenticated users can insert locations'
  ) THEN
    CREATE POLICY "authenticated users can insert locations" ON public.calendar_locations
      FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';
