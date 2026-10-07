-- Migration: 20261014000000_mentoria_sessoes_expansion.sql
-- Adiciona colunas dedicadas para Objetivo da Sessão e Registro da Mentora (Grid 2x2)

ALTER TABLE public.mentoria_sessoes
  ADD COLUMN IF NOT EXISTS objetivo_sessao TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS avancos_observados TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS pontos_desenvolvimento TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS evidencias_comportamentais TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS foco_proxima_sessao TEXT DEFAULT '';
