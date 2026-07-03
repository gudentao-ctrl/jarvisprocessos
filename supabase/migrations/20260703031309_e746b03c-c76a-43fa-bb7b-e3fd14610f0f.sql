
-- 1) Fix critical: gen_random_bytes lives in `extensions` schema, add to search_path
CREATE OR REPLACE FUNCTION public.indicators_autofill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  c_name TEXT;
  p_name TEXT;
  seq INT;
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(extensions.gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  IF NEW.code IS NULL OR NEW.code = '' THEN
    SELECT upper(regexp_replace(coalesce(name, 'EMP'), '\W+', '', 'g')) INTO c_name
      FROM public.companies WHERE id = NEW.company_id;
    SELECT upper(regexp_replace(coalesce(name, 'PROC'), '\W+', '', 'g')) INTO p_name
      FROM public.processes WHERE id = NEW.process_id;
    SELECT COALESCE(MAX(NULLIF(regexp_replace(code, '.*-IND-', ''), '')::int), 0) + 1 INTO seq
      FROM public.indicators
      WHERE company_id = NEW.company_id AND code LIKE '%-IND-%';
    NEW.code := COALESCE(c_name, 'EMP') || '-' || COALESCE(p_name, 'PROC') || '-IND-' || lpad(seq::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.action_plans_autofill()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.public_token IS NULL OR NEW.public_token = '' THEN
    NEW.public_token := replace(replace(replace(encode(extensions.gen_random_bytes(12), 'base64'), '+', '-'), '/', '_'), '=', '');
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) Action plans: GUT + extra fields
ALTER TABLE public.action_plans
  ADD COLUMN IF NOT EXISTS problem          text,
  ADD COLUMN IF NOT EXISTS cause            text,
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS gravity          smallint CHECK (gravity BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS urgency          smallint CHECK (urgency BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS trend            smallint CHECK (trend BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS new_due_date     date,
  ADD COLUMN IF NOT EXISTS expected_result  text,
  ADD COLUMN IF NOT EXISTS observations     text,
  ADD COLUMN IF NOT EXISTS evidences        jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS related_process_ids uuid[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS origin           text;

-- Generated column for GUT score
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='action_plans' AND column_name='gut_score') THEN
    ALTER TABLE public.action_plans
      ADD COLUMN gut_score integer GENERATED ALWAYS AS
        (COALESCE(gravity,0) * COALESCE(urgency,0) * COALESCE(trend,0)) STORED;
  END IF;
END $$;

-- 3) Action plan history
CREATE TABLE IF NOT EXISTS public.action_plan_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.action_plans(id) ON DELETE CASCADE,
  user_id uuid,
  field text NOT NULL,
  old_value text,
  new_value text,
  comment text,
  changed_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.action_plan_history TO authenticated;
GRANT ALL ON public.action_plan_history TO service_role;
ALTER TABLE public.action_plan_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read history" ON public.action_plan_history;
CREATE POLICY "auth read history" ON public.action_plan_history
  FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth insert history" ON public.action_plan_history;
CREATE POLICY "auth insert history" ON public.action_plan_history
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_action_plan_history_plan ON public.action_plan_history(plan_id, changed_at DESC);

-- Trigger to auto-log changes
CREATE OR REPLACE FUNCTION public.log_action_plan_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  fields text[] := ARRAY['title','description','status','priority','responsible','due_date',
                         'new_due_date','problem','cause','category','gravity','urgency','trend',
                         'expected_result','observations','origin'];
  f text;
  ov text;
  nv text;
BEGIN
  FOREACH f IN ARRAY fields LOOP
    EXECUTE format('SELECT ($1).%I::text, ($2).%I::text', f, f) INTO ov, nv USING OLD, NEW;
    IF ov IS DISTINCT FROM nv THEN
      INSERT INTO public.action_plan_history (plan_id, user_id, field, old_value, new_value)
      VALUES (NEW.id, uid, f, ov, nv);
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_action_plan_changes ON public.action_plans;
CREATE TRIGGER trg_log_action_plan_changes
  AFTER UPDATE ON public.action_plans
  FOR EACH ROW EXECUTE FUNCTION public.log_action_plan_changes();

-- 4) Calendar events: unify with hours + minutes + audio
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS duration_min integer,
  ADD COLUMN IF NOT EXISTS travel_min   integer,
  ADD COLUMN IF NOT EXISTS work_hours   numeric(6,2),
  ADD COLUMN IF NOT EXISTS minutes      text,
  ADD COLUMN IF NOT EXISTS audio_url    text,
  ADD COLUMN IF NOT EXISTS transcript   text,
  ADD COLUMN IF NOT EXISTS next_actions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS activity_type text;

-- 5) Restrict signups + block non-authorized emails at DB level
CREATE OR REPLACE FUNCTION public.enforce_single_user_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF lower(NEW.email) IS DISTINCT FROM 'g_zamboni@hotmail.com' THEN
    RAISE EXCEPTION 'Signup not allowed for this email';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_single_user_signup ON auth.users;
CREATE TRIGGER trg_enforce_single_user_signup
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_single_user_signup();
