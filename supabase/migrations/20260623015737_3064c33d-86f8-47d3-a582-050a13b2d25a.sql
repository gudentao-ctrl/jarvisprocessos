
-- interviews
ALTER TABLE public.interviews
  ADD COLUMN IF NOT EXISTS minutes_md text DEFAULT '',
  ADD COLUMN IF NOT EXISTS generation_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS generated_at timestamptz,
  ADD COLUMN IF NOT EXISTS transcript_hash text;

-- helper: add provenance cols
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'process_activities','pain_points','indicators',
    'improvement_opportunities','process_information_map','process_decision_map'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I
      ADD COLUMN IF NOT EXISTS generated_by_ai boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS source_interview_id uuid REFERENCES public.interviews(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS confidence numeric,
      ADD COLUMN IF NOT EXISTS validated_at timestamptz,
      ADD COLUMN IF NOT EXISTS validated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(source_interview_id)',
      t || '_source_interview_idx', t);
  END LOOP;
END$$;
