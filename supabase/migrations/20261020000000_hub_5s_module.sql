-- Migration: 20261020000000_hub_5s_module.sql
-- Módulo HUB 5S: Setores, Instruções de Trabalho (ITs), Auditorias, Cartão Vermelho, Configurações Whitelabel e Eventos

-- 1. Configurações Whitelabel do 5S por Empresa
CREATE TABLE IF NOT EXISTS public.fives_configuracoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE,
    url_hash TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    header_banner_url TEXT,
    slogan_campanha TEXT DEFAULT 'Praticar o 5S é transformar nosso ambiente com disciplina e excelência.',
    primary_color TEXT DEFAULT '#3E100C',
    secondary_color TEXT DEFAULT '#E05A10',
    bg_color TEXT DEFAULT '#FFF8F5',
    senso_destaque_mes TEXT DEFAULT 'Seiso (Senso de Limpeza)',
    comite_membros JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Setores do 5S
CREATE TABLE IF NOT EXISTS public.fives_setores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    nome_setor VARCHAR(255) NOT NULL,
    descricao TEXT,
    guardiao_nome TEXT,
    guardiao_user_id UUID,
    auditor_nome TEXT,
    auditor_user_id UUID,
    meta_nota NUMERIC DEFAULT 90.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ITs e Padrões de Limpeza por Setor
CREATE TABLE IF NOT EXISTS public.fives_instrucoes_trabalho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor_id UUID NOT NULL REFERENCES public.fives_setores(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    documento_url TEXT,
    foto_padrao_ouro_url TEXT,
    rotina_limpeza JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Auditorias Realizadas
CREATE TABLE IF NOT EXISTS public.fives_auditorias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor_id UUID NOT NULL REFERENCES public.fives_setores(id) ON DELETE CASCADE,
    auditor_user_id UUID,
    auditor_nome TEXT,
    data_auditoria TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    nota_final_percent NUMERIC NOT NULL,
    status_conclusao VARCHAR(50) DEFAULT 'CONCLUIDO',
    observacoes_gerais TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Itens Avaliados na Auditoria (com Foto e Plano de Ação automático)
CREATE TABLE IF NOT EXISTS public.fives_auditoria_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auditoria_id UUID NOT NULL REFERENCES public.fives_auditorias(id) ON DELETE CASCADE,
    senso VARCHAR(50) NOT NULL, -- Seiri, Seiton, Seiso, Seiketsu, Shitsuke
    pergunta TEXT NOT NULL,
    nota INT NOT NULL,
    foto_evidencia_url TEXT,
    observacao TEXT,
    plano_acao_o_que TEXT,
    plano_acao_responsavel TEXT,
    plano_acao_prazo DATE,
    plano_acao_status VARCHAR(50) DEFAULT 'PENDENTE' -- PENDENTE, EM_ANDAMENTO, CONCLUIDO
);

-- 6. Área do Cartão Vermelho (Descarte Provisório - Seiri)
CREATE TABLE IF NOT EXISTS public.fives_descartes_cartao_vermelho (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor_id UUID NOT NULL REFERENCES public.fives_setores(id) ON DELETE CASCADE,
    item_descricao TEXT NOT NULL,
    localizacao TEXT,
    foto_url TEXT,
    data_limite DATE,
    destinacao_status VARCHAR(50) DEFAULT 'PENDENTE', -- PENDENTE, DOACAO, SUCATA, RETORNO, LEILAO
    destinacao_observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Mural Antes vs. Depois
CREATE TABLE IF NOT EXISTS public.fives_mural_fotos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setor_id UUID REFERENCES public.fives_setores(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    foto_antes_url TEXT NOT NULL,
    foto_depois_url TEXT NOT NULL,
    data_registro DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Calendário Visual de Eventos e Dias D
CREATE TABLE IF NOT EXISTS public.fives_eventos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    setor_id UUID REFERENCES public.fives_setores(id) ON DELETE SET NULL,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo VARCHAR(50) DEFAULT 'DIA_D', -- DIA_D, AUDITORIA_CRUZADA, TREINAMENTO, COMITE
    data_evento DATE NOT NULL,
    horario TEXT,
    responsavel TEXT,
    concluido BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices de Performance
CREATE INDEX IF NOT EXISTS idx_fives_configuracoes_url_hash ON public.fives_configuracoes(url_hash);
CREATE INDEX IF NOT EXISTS idx_fives_setores_company ON public.fives_setores(company_id);
CREATE INDEX IF NOT EXISTS idx_fives_auditorias_setor ON public.fives_auditorias(setor_id);
CREATE INDEX IF NOT EXISTS idx_fives_auditoria_itens_auditoria ON public.fives_auditoria_itens(auditoria_id);
CREATE INDEX IF NOT EXISTS idx_fives_descartes_setor ON public.fives_descartes_cartao_vermelho(setor_id);

-- RLS (Row Level Security)
ALTER TABLE public.fives_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_setores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_instrucoes_trabalho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_auditorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_auditoria_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_descartes_cartao_vermelho ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_mural_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fives_eventos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS:
-- 1. Leitura Pública anônima para portais via link
CREATE POLICY "Public anon select fives_configuracoes" ON public.fives_configuracoes FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_setores" ON public.fives_setores FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_instrucoes_trabalho" ON public.fives_instrucoes_trabalho FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_auditorias" ON public.fives_auditorias FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_auditoria_itens" ON public.fives_auditoria_itens FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_descartes_cartao_vermelho" ON public.fives_descartes_cartao_vermelho FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_mural_fotos" ON public.fives_mural_fotos FOR SELECT TO anon USING (true);
CREATE POLICY "Public anon select fives_eventos" ON public.fives_eventos FOR SELECT TO anon USING (true);

-- 2. Acesso Total para Autenticados
CREATE POLICY "Auth all fives_configuracoes" ON public.fives_configuracoes FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_setores" ON public.fives_setores FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_instrucoes_trabalho" ON public.fives_instrucoes_trabalho FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_auditorias" ON public.fives_auditorias FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_auditoria_itens" ON public.fives_auditoria_itens FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_descartes_cartao_vermelho" ON public.fives_descartes_cartao_vermelho FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_mural_fotos" ON public.fives_mural_fotos FOR ALL TO authenticated USING (true);
CREATE POLICY "Auth all fives_eventos" ON public.fives_eventos FOR ALL TO authenticated USING (true);
