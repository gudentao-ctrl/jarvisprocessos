-- 1. Agenda invitation fields the app already sends (never stored before).
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS is_internal_invite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS guest_emails text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE TABLE IF NOT EXISTS public.calendar_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.calendar_locations TO authenticated;
GRANT ALL ON public.calendar_locations TO service_role;
ALTER TABLE public.calendar_locations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS calendar_locations_read ON public.calendar_locations;
CREATE POLICY calendar_locations_read ON public.calendar_locations FOR SELECT TO authenticated
  USING (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'));
DROP POLICY IF EXISTS calendar_locations_insert ON public.calendar_locations;
CREATE POLICY calendar_locations_insert ON public.calendar_locations FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND (private.is_superadmin() OR EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active')));
DROP POLICY IF EXISTS calendar_locations_delete ON public.calendar_locations;
CREATE POLICY calendar_locations_delete ON public.calendar_locations FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR private.is_superadmin());

-- 2. Team helpers.
CREATE OR REPLACE FUNCTION private.is_team_member(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _uid AND r.is_superadmin)
    OR (EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _uid AND p.status = 'active')
        AND EXISTS (SELECT 1 FROM public.user_company_permissions m
                    WHERE m.user_id = _uid AND m.role IN ('CONSULTOR','GESTOR','SUPERADMIN')))
$$;

CREATE OR REPLACE FUNCTION private.can_invite_team(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = _uid AND r.is_superadmin)
    OR EXISTS (SELECT 1 FROM public.user_company_permissions m WHERE m.user_id = _uid AND m.role IN ('GESTOR','SUPERADMIN'))
    OR EXISTS (SELECT 1 FROM public.company_members c WHERE c.user_id = _uid
               AND (c.member_role = 'gestor' OR coalesce((c.permissions->>'gestao')::boolean, false)))
$$;

CREATE OR REPLACE FUNCTION private.is_calendar_invitee(_row jsonb)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    (coalesce((_row->>'is_internal_invite')::boolean, false) AND private.is_team_member(auth.uid()))
    OR EXISTS (
      SELECT 1 FROM public.profiles p,
        jsonb_array_elements_text(CASE WHEN jsonb_typeof(_row->'guest_emails') = 'array' THEN _row->'guest_emails' ELSE '[]'::jsonb END) g(email)
      WHERE p.user_id = auth.uid() AND p.status = 'active' AND p.email IS NOT NULL
        AND lower(p.email) = lower(g.email))
  )
$$;
REVOKE ALL ON FUNCTION private.is_team_member(uuid), private.can_invite_team(uuid), private.is_calendar_invitee(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_team_member(uuid), private.can_invite_team(uuid), private.is_calendar_invitee(jsonb) TO authenticated;

-- Invitees can read the meetings they were invited to.
DROP POLICY IF EXISTS calendar_events_invitee_read ON public.calendar_events;
CREATE POLICY calendar_events_invitee_read ON public.calendar_events FOR SELECT TO authenticated
  USING (private.is_calendar_invitee(to_jsonb(calendar_events.*)));
DROP POLICY IF EXISTS granular_gate_select ON public.calendar_events;
CREATE POLICY granular_gate_select ON public.calendar_events AS RESTRICTIVE FOR SELECT TO authenticated
  USING (private.granular_row_access('calendar_events', to_jsonb(calendar_events.*), 'read')
         OR private.is_calendar_invitee(to_jsonb(calendar_events.*)));

-- Only managers may flag a whole-team meeting; guest lists stay bounded.
CREATE OR REPLACE FUNCTION public.guard_calendar_invites()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF coalesce(array_length(NEW.guest_emails, 1), 0) > 50 THEN
    RAISE EXCEPTION 'Limite de 50 convidados por evento.';
  END IF;
  IF NEW.is_internal_invite AND auth.uid() IS NOT NULL
     AND (TG_OP = 'INSERT' OR NOT OLD.is_internal_invite)
     AND NOT private.can_invite_team(auth.uid()) THEN
    RAISE EXCEPTION 'Somente gestores podem convidar toda a equipe.';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.guard_calendar_invites() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_calendar_invites ON public.calendar_events;
CREATE TRIGGER guard_calendar_invites BEFORE INSERT OR UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.guard_calendar_invites();

-- 3. Personal notifications, device subscriptions and push signing keys.
CREATE TABLE public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('new_signup','access_request','ticket','team_meeting','meeting_invite','meeting_changed')),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  body text NOT NULL DEFAULT '' CHECK (char_length(body) <= 500),
  link text NOT NULL DEFAULT '/' CHECK (link LIKE '/%' AND link NOT LIKE '//%' AND char_length(link) <= 200),
  source_id uuid,
  read_at timestamptz,
  pushed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_notifications_user_created_idx ON public.user_notifications (user_id, created_at DESC);
GRANT SELECT, DELETE ON public.user_notifications TO authenticated;
GRANT UPDATE (read_at) ON public.user_notifications TO authenticated;
GRANT ALL ON public.user_notifications TO service_role;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_notifications_own_read ON public.user_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY user_notifications_own_update ON public.user_notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY user_notifications_own_delete ON public.user_notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  endpoint text NOT NULL UNIQUE CHECK (endpoint LIKE 'https://%' AND char_length(endpoint) <= 1000),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 20 AND 200),
  auth text NOT NULL CHECK (char_length(auth) BETWEEN 8 AND 100),
  user_agent text NOT NULL DEFAULT '' CHECK (char_length(user_agent) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);
CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions (user_id);
GRANT SELECT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY push_subscriptions_own_read ON public.push_subscriptions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY push_subscriptions_own_delete ON public.push_subscriptions FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.push_vapid_config (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  public_key text NOT NULL,
  private_jwk jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.push_vapid_config FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.push_vapid_config TO service_role;
ALTER TABLE public.push_vapid_config ENABLE ROW LEVEL SECURITY;

-- A device belongs to whoever signed in on it last.
CREATE OR REPLACE FUNCTION public.register_push_subscription(_endpoint text, _p256dh text, _auth text, _user_agent text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT (private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active')) THEN
    RAISE EXCEPTION 'Usuário sem acesso ativo.';
  END IF;
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), _endpoint, _p256dh, _auth, left(coalesce(_user_agent, ''), 300))
  ON CONFLICT (endpoint) DO UPDATE SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
    auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent, created_at = now();
END $$;
REVOKE ALL ON FUNCTION public.register_push_subscription(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_subscription(text, text, text, text) TO authenticated;

-- 4. Notification fan-out: stores rows, rings data-free personal doorbells, asks the app to send pushes.
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION private.push_notify(_user_ids uuid[], _kind text, _title text, _body text, _link text, _source uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ids uuid[]; _uid uuid;
BEGIN
  WITH ins AS (
    INSERT INTO public.user_notifications (user_id, kind, title, body, link, source_id)
    SELECT DISTINCT u, _kind, left(_title, 200), left(coalesce(_body, ''), 500), _link, _source
    FROM unnest(_user_ids) AS u WHERE u IS NOT NULL
    RETURNING id
  ) SELECT array_agg(id) INTO _ids FROM ins;
  IF _ids IS NULL THEN RETURN; END IF;
  FOR _uid IN SELECT DISTINCT u FROM unnest(_user_ids) AS u WHERE u IS NOT NULL LOOP
    BEGIN
      PERFORM realtime.send(jsonb_build_object('t', 'notification'), 'changed', 'user-bell:' || _uid::text, true);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
  BEGIN
    PERFORM net.http_post(
      url := 'https://jarvisprocessos.lovable.app/api/public/push-dispatch',
      body := jsonb_build_object('ids', to_jsonb(_ids)),
      headers := '{"Content-Type":"application/json"}'::jsonb,
      timeout_milliseconds := 8000);
  EXCEPTION WHEN others THEN NULL;
  END;
EXCEPTION WHEN others THEN
  -- Never block the original save because of a notification failure.
  NULL;
END $$;
REVOKE ALL ON FUNCTION private.push_notify(uuid[], text, text, text, text, uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.superadmin_ids(_except uuid)
RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(array_agg(DISTINCT r.user_id), '{}') FROM public.user_roles r
  WHERE r.is_superadmin AND r.user_id IS DISTINCT FROM _except
$$;
REVOKE ALL ON FUNCTION private.superadmin_ids(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.notify_new_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM 'active' AND NOT coalesce(NEW.is_superadmin, false) THEN
    PERFORM private.push_notify(private.superadmin_ids(NEW.user_id), 'new_signup',
      'Novo cadastro aguardando aprovação',
      coalesce(nullif(NEW.full_name, ''), 'Novo usuário') || coalesce(' · ' || NEW.email, ''),
      '/admin', NEW.user_id);
  END IF;
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_access_request()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM private.push_notify(private.superadmin_ids(NEW.user_id), 'access_request',
    'Nova solicitação de acesso',
    coalesce(nullif(NEW.full_name, ''), NEW.email, 'Usuário') ||
      coalesce(' · ' || nullif(NEW.requested_company, ''), ''),
    '/admin', NEW.id);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_new_ticket()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _who text;
BEGIN
  SELECT coalesce(nullif(full_name, ''), email) INTO _who FROM public.profiles WHERE user_id = NEW.created_by;
  PERFORM private.push_notify(private.superadmin_ids(NEW.created_by), 'ticket',
    CASE WHEN NEW.kind = 'bug' THEN 'Novo chamado de erro' ELSE 'Novo chamado de melhoria' END,
    NEW.title || coalesce(' · ' || _who, ''),
    '/admin', NEW.id);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.notify_calendar_meeting()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _when text;
  _body text;
  _team uuid[] := '{}';
  _guests uuid[] := '{}';
  _old_guests text[] := '{}';
  _is_team boolean := NEW.is_internal_invite;
BEGIN
  _when := to_char(NEW.starts_at AT TIME ZONE 'America/Sao_Paulo', 'DD/MM "às" HH24:MI');
  _body := _when || coalesce(' · ' || nullif(NEW.location, ''), '');

  IF _is_team THEN
    SELECT coalesce(array_agg(DISTINCT p.user_id), '{}') INTO _team
    FROM public.profiles p
    WHERE p.user_id IS DISTINCT FROM NEW.created_by AND private.is_team_member(p.user_id);
  END IF;

  IF TG_OP = 'UPDATE' THEN _old_guests := coalesce(OLD.guest_emails, '{}'); END IF;

  SELECT coalesce(array_agg(DISTINCT p.user_id), '{}') INTO _guests
  FROM public.profiles p
  WHERE p.status = 'active' AND p.email IS NOT NULL AND p.user_id IS DISTINCT FROM NEW.created_by
    AND lower(p.email) IN (SELECT lower(e) FROM unnest(coalesce(NEW.guest_emails, '{}')) e)
    AND (TG_OP = 'INSERT' OR lower(p.email) NOT IN (SELECT lower(e) FROM unnest(_old_guests) e) OR NEW.starts_at IS DISTINCT FROM OLD.starts_at);

  IF TG_OP = 'INSERT' THEN
    IF _is_team THEN
      PERFORM private.push_notify(_team, 'team_meeting', 'Nova reunião de equipe: ' || NEW.title, _body, '/calendario', NEW.id);
    END IF;
    PERFORM private.push_notify(array(SELECT unnest(_guests) EXCEPT SELECT unnest(_team)), 'meeting_invite',
      'Você foi convidado: ' || NEW.title, _body, '/calendario', NEW.id);
  ELSE
    IF _is_team AND NOT OLD.is_internal_invite THEN
      PERFORM private.push_notify(_team, 'team_meeting', 'Nova reunião de equipe: ' || NEW.title, _body, '/calendario', NEW.id);
    ELSIF _is_team AND NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN
      PERFORM private.push_notify(_team, 'meeting_changed', 'Reunião remarcada: ' || NEW.title, _body, '/calendario', NEW.id);
    END IF;
    IF NOT (_is_team AND (NOT OLD.is_internal_invite OR NEW.starts_at IS DISTINCT FROM OLD.starts_at)) THEN
      _team := '{}';
    END IF;
    PERFORM private.push_notify(array(SELECT unnest(_guests) EXCEPT SELECT unnest(_team)),
      CASE WHEN NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN 'meeting_changed' ELSE 'meeting_invite' END,
      CASE WHEN NEW.starts_at IS DISTINCT FROM OLD.starts_at THEN 'Reunião remarcada: ' ELSE 'Você foi convidado: ' END || NEW.title,
      _body, '/calendario', NEW.id);
  END IF;
  RETURN NULL;
EXCEPTION WHEN others THEN
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.notify_new_signup(), public.notify_access_request(), public.notify_new_ticket(), public.notify_calendar_meeting() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notify_new_signup ON public.profiles;
CREATE TRIGGER notify_new_signup AFTER INSERT ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.notify_new_signup();
DROP TRIGGER IF EXISTS notify_access_request ON public.access_requests;
CREATE TRIGGER notify_access_request AFTER INSERT ON public.access_requests FOR EACH ROW EXECUTE FUNCTION public.notify_access_request();
DROP TRIGGER IF EXISTS notify_new_ticket ON public.tickets;
CREATE TRIGGER notify_new_ticket AFTER INSERT ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.notify_new_ticket();
DROP TRIGGER IF EXISTS notify_calendar_meeting ON public.calendar_events;
CREATE TRIGGER notify_calendar_meeting AFTER INSERT OR UPDATE OF starts_at, is_internal_invite, guest_emails ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_calendar_meeting();

-- 5. Personal doorbell topic: only the owner may listen.
CREATE OR REPLACE FUNCTION public.can_receive_bell(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT (private.is_superadmin() OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND status = 'active'
  )) THEN
    RETURN false;
  END IF;
  IF _topic = 'app-bell' THEN RETURN true; END IF;
  IF _topic = 'user-bell:' || auth.uid()::text THEN RETURN true; END IF;
  IF _topic LIKE 'company-bell:%' THEN
    BEGIN
      _cid := substr(_topic, 14)::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN private.is_superadmin() OR EXISTS (
      SELECT 1 FROM public.user_company_permissions WHERE user_id = auth.uid() AND company_id = _cid
    );
  END IF;
  RETURN false;
END
$$;
REVOKE ALL ON FUNCTION public.can_receive_bell(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_receive_bell(text) TO authenticated;

NOTIFY pgrst, 'reload schema';