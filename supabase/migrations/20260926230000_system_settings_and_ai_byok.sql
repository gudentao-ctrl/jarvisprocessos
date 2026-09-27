-- Migration: System Settings and AI BYOK Configuration
-- Permite armazenar configurações globais do sistema, incluindo chaves de IA (BYOK) para operação ilimitada.

CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  is_secret BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Habilitar RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Política de Leitura: usuários autenticados podem ver configurações não-secretas
CREATE POLICY "authenticated_can_read_non_secret_settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (is_secret = false);

-- Política de SuperAdmin: superadmins podem ler todas as configurações (inclusive secretas)
CREATE POLICY "superadmin_can_read_all_settings"
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true
    )
  );

-- Política de Escrita: apenas superadmins podem inserir/atualizar/excluir
CREATE POLICY "superadmin_can_manage_settings"
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.is_superadmin = true
    )
  );

-- Inserir configurações padrão
INSERT INTO public.system_settings (key, value, description, is_secret)
VALUES 
  ('ai_provider', 'openai', 'Provedor principal de IA (openai ou lovable)', false),
  ('openai_model_chat', 'gpt-4o', 'Modelo padrão OpenAI para análise e geração', false),
  ('openai_model_transcribe', 'whisper-1', 'Modelo padrão OpenAI para transcrição de áudio', false)
ON CONFLICT (key) DO NOTHING;
