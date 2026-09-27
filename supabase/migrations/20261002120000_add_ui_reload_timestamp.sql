-- migrations/20261002120000_add_ui_reload_timestamp.sql
CREATE TABLE IF NOT EXISTS public.system_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  description text,
  is_secret boolean DEFAULT false
);

-- Insert initial timestamp if not exists
INSERT INTO public.system_settings (key, value, description, is_secret)
VALUES ('ui_reload_timestamp', to_char(now(), 'YYYY-MM-DD HH24:MI:SS'), 'Timestamp used by Jarvis UI to trigger live reload', false)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
