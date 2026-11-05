-- Each person's private Google Agenda address (encrypted) and a short-lived cache of busy times only.
CREATE TABLE public.user_calendar_feeds (
  user_id uuid PRIMARY KEY,
  feed_ciphertext text NOT NULL CHECK (char_length(feed_ciphertext) <= 4000),
  busy_cache jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(busy_cache) = 'array' AND pg_column_size(busy_cache) <= 400000),
  cached_at timestamptz,
  last_error text CHECK (char_length(last_error) <= 300),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.user_calendar_feeds FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.user_calendar_feeds TO service_role;
ALTER TABLE public.user_calendar_feeds ENABLE ROW LEVEL SECURITY;