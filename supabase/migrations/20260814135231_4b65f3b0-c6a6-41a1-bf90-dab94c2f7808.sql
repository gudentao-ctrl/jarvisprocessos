ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS audio_parts text[];
ALTER TABLE public.interviews ADD COLUMN IF NOT EXISTS audio_duration_sec integer;