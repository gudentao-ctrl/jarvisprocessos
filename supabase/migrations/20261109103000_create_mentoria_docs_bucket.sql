-- Migration: Criação e políticas do bucket mentoria-docs para armazenar laudos e arquivos de mapeamento comportamental
INSERT INTO storage.buckets (id, name, public)
VALUES ('mentoria-docs', 'mentoria-docs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Permitir que usuários autenticados façam upload, leitura, atualização e exclusão
DROP POLICY IF EXISTS "auth manage mentoria-docs" ON storage.objects;
CREATE POLICY "auth manage mentoria-docs"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'mentoria-docs')
WITH CHECK (bucket_id = 'mentoria-docs');

-- Permitir leitura pública dos arquivos
DROP POLICY IF EXISTS "public read mentoria-docs" ON storage.objects;
CREATE POLICY "public read mentoria-docs"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'mentoria-docs');
