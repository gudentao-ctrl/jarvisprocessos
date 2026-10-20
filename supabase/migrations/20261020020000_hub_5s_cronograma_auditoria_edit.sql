-- Migração para Edição/Exclusão de Auditorias 5S e Tabela de Cronograma da Implantação 5S
-- Bloco 27.3 - HUB 5S

-- 1. Políticas de UPDATE e DELETE em public.fives_auditorias para SuperAdmin e Consultor
DROP POLICY IF EXISTS "SuperAdmin pode editar qualquer auditoria 5S" ON public.fives_auditorias;
CREATE POLICY "SuperAdmin pode editar qualquer auditoria 5S"
ON public.fives_auditorias
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_company_permissions
        WHERE user_id = auth.uid() AND role IN ('SUPERADMIN', 'GESTOR')
    )
);

DROP POLICY IF EXISTS "SuperAdmin pode deletar qualquer auditoria 5S" ON public.fives_auditorias;
CREATE POLICY "SuperAdmin pode deletar qualquer auditoria 5S"
ON public.fives_auditorias
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_company_permissions
        WHERE user_id = auth.uid() AND role IN ('SUPERADMIN', 'GESTOR')
    )
);

-- Políticas em public.fives_auditoria_itens
DROP POLICY IF EXISTS "SuperAdmin pode editar itens de auditoria 5S" ON public.fives_auditoria_itens;
CREATE POLICY "SuperAdmin pode editar itens de auditoria 5S"
ON public.fives_auditoria_itens
FOR UPDATE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_company_permissions
        WHERE user_id = auth.uid() AND role IN ('SUPERADMIN', 'GESTOR')
    )
);

DROP POLICY IF EXISTS "SuperAdmin pode deletar itens de auditoria 5S" ON public.fives_auditoria_itens;
CREATE POLICY "SuperAdmin pode deletar itens de auditoria 5S"
ON public.fives_auditoria_itens
FOR DELETE TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_company_permissions
        WHERE user_id = auth.uid() AND role IN ('SUPERADMIN', 'GESTOR')
    )
);

-- 2. Tabela de Cronograma da Implantação 5S (Roadmap)
CREATE TABLE IF NOT EXISTS public.fives_cronograma_projeto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    etapa_titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    data_inicio DATE,
    data_fim DATE,
    responsavel VARCHAR(255),
    status VARCHAR(50) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_ANDAMENTO', 'CONCLUIDO')),
    ordem INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS para o cronograma
ALTER TABLE public.fives_cronograma_projeto ENABLE ROW LEVEL SECURITY;

-- Leitura pública / anônima e autenticada
DROP POLICY IF EXISTS "Todos podem visualizar cronograma do projeto 5S" ON public.fives_cronograma_projeto;
CREATE POLICY "Todos podem visualizar cronograma do projeto 5S"
ON public.fives_cronograma_projeto
FOR SELECT TO anon, authenticated
USING (true);

-- Gestão do cronograma por usuários autenticados da empresa
DROP POLICY IF EXISTS "Gestores podem gerenciar cronograma 5S" ON public.fives_cronograma_projeto;
CREATE POLICY "Gestores podem gerenciar cronograma 5S"
ON public.fives_cronograma_projeto
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Habilita Realtime para a tabela do cronograma
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fives_cronograma_projeto;
EXCEPTION WHEN OTHERS THEN
    -- Já incluído ou sem permissão direta
    NULL;
END $$;
