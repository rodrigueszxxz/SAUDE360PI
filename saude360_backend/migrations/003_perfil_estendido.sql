-- =============================================================================
-- Migration 003: Perfil Estendido do Paciente
-- Adiciona colunas para dados completos do paciente na tabela usuarios
-- Executar no SQL Editor do Supabase
-- =============================================================================

-- Dados pessoais
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS nome_social         TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS data_nascimento     DATE;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS rg                  TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS sexo                TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS estado_civil        TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS foto_perfil         TEXT;

-- Contato adicional
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS telefone_fixo       TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cep                 TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS cidade              TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS endereco            TEXT;

-- Dados de saúde
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS peso                NUMERIC(5,1);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS altura              NUMERIC(5,1);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS tipo_sanguineo      TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS alergias            TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS medicacoes          TEXT;

-- Plano de saúde / convênio
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS convenio_operadora  TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS convenio_numero     TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS convenio_tipo       TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS convenio_validade   DATE;

-- Contato de emergência
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emergencia_nome         TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emergencia_parentesco   TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emergencia_telefone     TEXT;
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS emergencia_email        TEXT;

-- Auditoria
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS atualizado_em       TIMESTAMPTZ DEFAULT NOW();
