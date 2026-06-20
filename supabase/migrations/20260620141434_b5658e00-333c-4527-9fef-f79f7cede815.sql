
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'member');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL DEFAULT 'member',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Auto-add member role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'member')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- Companies
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage companies" ON public.companies FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Sectors
CREATE TABLE public.sectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX sectors_company_id_idx ON public.sectors(company_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sectors TO authenticated;
GRANT ALL ON public.sectors TO service_role;
ALTER TABLE public.sectors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage sectors" ON public.sectors FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Interviews
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  sector_id UUID REFERENCES public.sectors(id) ON DELETE SET NULL,
  participant TEXT,
  interview_date DATE NOT NULL DEFAULT CURRENT_DATE,
  audio_path TEXT,
  audio_mime TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX interviews_created_at_idx ON public.interviews(created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;
GRANT ALL ON public.interviews TO service_role;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage interviews" ON public.interviews FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER interviews_updated_at BEFORE UPDATE ON public.interviews FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transcripts
CREATE TABLE public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcripts TO authenticated;
GRANT ALL ON public.transcripts TO service_role;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage transcripts" ON public.transcripts FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER transcripts_updated_at BEFORE UPDATE ON public.transcripts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Transcript edits history
CREATE TABLE public.transcript_edits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  previous_content TEXT NOT NULL,
  edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX transcript_edits_transcript_id_idx ON public.transcript_edits(transcript_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transcript_edits TO authenticated;
GRANT ALL ON public.transcript_edits TO service_role;
ALTER TABLE public.transcript_edits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage transcript edits" ON public.transcript_edits FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Interview analysis
CREATE TABLE public.interview_analysis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL UNIQUE REFERENCES public.interviews(id) ON DELETE CASCADE,
  summary TEXT NOT NULL DEFAULT '',
  insights JSONB NOT NULL DEFAULT '[]'::jsonb,
  critical_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  pains JSONB NOT NULL DEFAULT '[]'::jsonb,
  problems JSONB NOT NULL DEFAULT '[]'::jsonb,
  decisions JSONB NOT NULL DEFAULT '[]'::jsonb,
  flows JSONB NOT NULL DEFAULT '[]'::jsonb,
  systems JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interview_analysis TO authenticated;
GRANT ALL ON public.interview_analysis TO service_role;
ALTER TABLE public.interview_analysis ENABLE ROW LEVEL SECURITY;
CREATE POLICY "team can manage interview analysis" ON public.interview_analysis FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER interview_analysis_updated_at BEFORE UPDATE ON public.interview_analysis FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Storage policies for interview-audio bucket
CREATE POLICY "team can read interview audio" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'interview-audio');
CREATE POLICY "team can upload interview audio" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'interview-audio');
CREATE POLICY "team can update interview audio" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'interview-audio');
CREATE POLICY "team can delete interview audio" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'interview-audio');
