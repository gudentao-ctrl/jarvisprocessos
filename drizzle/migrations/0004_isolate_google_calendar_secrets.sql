CREATE TABLE public.google_calendar_private_config (
 id boolean PRIMARY KEY DEFAULT true CHECK (id),
 client_id text NOT NULL,
 client_secret text NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_calendar_private_config TO service_role;
ALTER TABLE public.google_calendar_private_config ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.google_calendar_private_tokens (
 user_id uuid PRIMARY KEY,
 access_token text NOT NULL,
 refresh_token text,
 expiry_date bigint,
 google_email text,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.google_calendar_private_tokens TO service_role;
ALTER TABLE public.google_calendar_private_tokens ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.google_calendar_oauth_states (
 state text PRIMARY KEY,
 user_id uuid NOT NULL,
 redirect_uri text NOT NULL,
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes')
);
GRANT ALL ON public.google_calendar_oauth_states TO service_role;
ALTER TABLE public.google_calendar_oauth_states ENABLE ROW LEVEL SECURITY;
INSERT INTO public.google_calendar_private_config (id, client_id, client_secret)
SELECT true, header_html::jsonb->'googleOAuth'->>'clientId', header_html::jsonb->'googleOAuth'->>'clientSecret'
FROM public.document_templates
WHERE name='__maia_finance_store_v1__' AND header_html::jsonb->'googleOAuth'->>'clientId' IS NOT NULL AND header_html::jsonb->'googleOAuth'->>'clientSecret' IS NOT NULL
LIMIT 1 ON CONFLICT (id) DO NOTHING;
INSERT INTO public.google_calendar_private_tokens(user_id,access_token,refresh_token,expiry_date,google_email)
SELECT item.key::uuid,item.value->>'access_token',item.value->>'refresh_token',nullif(item.value->>'expiry_date','')::bigint,item.value->>'google_email'
FROM public.document_templates t CROSS JOIN LATERAL jsonb_each(coalesce(t.header_html::jsonb->'googleTokens','{}'::jsonb)) item
WHERE t.name='__maia_finance_store_v1__' AND item.value->>'access_token' IS NOT NULL
ON CONFLICT(user_id) DO NOTHING;
CREATE OR REPLACE FUNCTION public.redact_legacy_google_store() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
 IF NEW.name='__maia_finance_store_v1__' THEN
  NEW.header_html := (NEW.header_html::jsonb - 'googleOAuth' - 'googleTokens')::text;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER redact_legacy_google_store BEFORE INSERT OR UPDATE OF header_html ON public.document_templates FOR EACH ROW EXECUTE FUNCTION public.redact_legacy_google_store();
UPDATE public.document_templates SET header_html=(header_html::jsonb - 'googleOAuth' - 'googleTokens')::text WHERE name='__maia_finance_store_v1__';
COMMENT ON TABLE public.google_calendar_private_config IS 'Server-only OAuth configuration; no browser Data API grants or policies. Managed environment credentials take precedence.';
COMMENT ON TABLE public.google_calendar_private_tokens IS 'Server-only per-user Calendar tokens. Handlers must authenticate before access and never serialize these rows.';
COMMENT ON FUNCTION public.redact_legacy_google_store() IS 'DEPRECATED Google credential fields in document_templates are redacted; replaced by server-only Google Calendar tables.';