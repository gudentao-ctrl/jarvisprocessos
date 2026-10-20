-- ============================================================================
-- MIGRATION: EVOLUÇÃO COMPLETA DO MÓDULO HUB 5S (BLOCO 27.2)
-- Realtime, Questões Customizadas, Fluxo de Arquivamento e Role AUDITOR_5S
-- ============================================================================

-- 1. Atualização do Enum / Constraint de Roles para inclusão de AUDITOR_5S
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_company_permissions_role_check'
    ) THEN
        ALTER TABLE public.user_company_permissions 
        DROP CONSTRAINT user_company_permissions_role_check;
        
        ALTER TABLE public.user_company_permissions 
        ADD CONSTRAINT user_company_permissions_role_check 
        CHECK (role IN ('SUPERADMIN', 'GESTOR', 'CONSULTOR', 'CLIENTE', 'AUDITOR_5S'));
    END IF;
END $$;

-- 2. Tabela para Questões Customizadas do Checklist 5S por Empresa
CREATE TABLE IF NOT EXISTS public.fives_perguntas_customizadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    senso VARCHAR(20) NOT NULL CHECK (senso IN ('SEIRI', 'SEITON', 'SEISO', 'SEIKETSU', 'SHITSUKE', 'Seiri', 'Seiton', 'Seiso', 'Seiketsu', 'Shitsuke')),
    titulo_pergunta TEXT NOT NULL,
    criterio_avaliacao TEXT NOT NULL,
    ativo BOOLEAN DEFAULT true,
    ordem INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_fives_perguntas_company_senso 
ON public.fives_perguntas_customizadas(company_id, senso, ativo);

-- 3. Campos de Controle de Conclusão e Arquivamento no Cartão Vermelho
ALTER TABLE public.fives_descartes_cartao_vermelho
ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS data_conclusao TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_fives_descartes_arquivado 
ON public.fives_descartes_cartao_vermelho(setor_id, arquivado);

-- 4. Habilitação de Políticas RLS para fives_perguntas_customizadas
ALTER TABLE public.fives_perguntas_customizadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fives_perguntas_public_read"
ON public.fives_perguntas_customizadas FOR SELECT
USING (true);

CREATE POLICY "fives_perguntas_authenticated_manage"
ON public.fives_perguntas_customizadas FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 5. Habilitação de Realtime no Supabase para as tabelas do 5S
ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_auditorias;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_setores;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_descartes_cartao_vermelho;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_configuracoes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_mural_fotos;
