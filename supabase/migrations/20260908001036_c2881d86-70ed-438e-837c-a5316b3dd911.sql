ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

UPDATE public.work_hours SET user_id = created_by WHERE user_id IS NULL AND created_by IS NOT NULL;

ALTER TABLE public.work_hours ALTER COLUMN project_id DROP NOT NULL;