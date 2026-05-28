-- ============================================================
-- Migration 011: Prontuário Médico Completo
-- Saúde 360
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Expandir tabela prontuarios com campos completos
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS anamnese           TEXT;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS exame_fisico       TEXT;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS hipotese_diagnostica TEXT;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS plano_terapeutico  TEXT;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS pressao_arterial   VARCHAR(20);
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS frequencia_cardiaca INTEGER;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS saturacao_o2        NUMERIC(5,2);
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS temperatura         NUMERIC(4,1);
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS peso_consulta       NUMERIC(5,1);
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS altura_consulta     NUMERIC(5,2);
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS observacoes_privadas TEXT;
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS status             VARCHAR(20) DEFAULT 'RASCUNHO'
  CHECK (status IN ('RASCUNHO', 'FINALIZADO', 'CANCELADO'));
ALTER TABLE prontuarios ADD COLUMN IF NOT EXISTS assinatura_digital  TEXT;

-- Tabela de receitas médicas
CREATE TABLE IF NOT EXISTS receitas (
  id              BIGSERIAL PRIMARY KEY,
  prontuario_id   BIGINT REFERENCES prontuarios(id) ON DELETE CASCADE,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  medico_id       BIGINT REFERENCES medicos(id),
  paciente_cpf    VARCHAR(14),
  medicamentos    JSONB NOT NULL DEFAULT '[]',
  -- Ex: [{"nome":"Paracetamol 500mg","posologia":"1 comprimido de 8/8h","quantidade":"20 comprimidos","via":"oral"}]
  observacoes     TEXT,
  validade_dias   INTEGER DEFAULT 30,
  tipo            VARCHAR(20) DEFAULT 'SIMPLES' CHECK (tipo IN ('SIMPLES', 'ESPECIAL_BRANCO', 'ESPECIAL_AMARELO')),
  pdf_url         TEXT,
  emitida_em      TIMESTAMPTZ DEFAULT NOW(),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receitas_prontuario ON receitas(prontuario_id);
CREATE INDEX IF NOT EXISTS idx_receitas_paciente   ON receitas(paciente_cpf);
CREATE INDEX IF NOT EXISTS idx_receitas_medico     ON receitas(medico_id);

-- Tabela de atestados médicos
CREATE TABLE IF NOT EXISTS atestados (
  id              BIGSERIAL PRIMARY KEY,
  prontuario_id   BIGINT REFERENCES prontuarios(id) ON DELETE CASCADE,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  medico_id       BIGINT REFERENCES medicos(id),
  paciente_cpf    VARCHAR(14),
  tipo            VARCHAR(30) DEFAULT 'AFASTAMENTO' CHECK (tipo IN ('AFASTAMENTO', 'COMPARECIMENTO', 'ACOMPANHAMENTO', 'APTIDAO')),
  dias_afastamento INTEGER,
  cid             VARCHAR(20),
  descricao       TEXT,
  pdf_url         TEXT,
  emitido_em      TIMESTAMPTZ DEFAULT NOW(),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_atestados_paciente ON atestados(paciente_cpf);
CREATE INDEX IF NOT EXISTS idx_atestados_medico   ON atestados(medico_id);

-- Tabela de pedidos de exame
CREATE TABLE IF NOT EXISTS pedidos_exame (
  id              BIGSERIAL PRIMARY KEY,
  prontuario_id   BIGINT REFERENCES prontuarios(id) ON DELETE CASCADE,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  medico_id       BIGINT REFERENCES medicos(id),
  paciente_cpf    VARCHAR(14),
  exames          JSONB NOT NULL DEFAULT '[]',
  -- Ex: [{"nome":"Hemograma Completo","urgencia":"ROTINA","observacao":""}]
  urgencia        VARCHAR(20) DEFAULT 'ROTINA' CHECK (urgencia IN ('ROTINA', 'URGENTE', 'MUITO_URGENTE')),
  observacoes     TEXT,
  validade_dias   INTEGER DEFAULT 90,
  pdf_url         TEXT,
  emitido_em      TIMESTAMPTZ DEFAULT NOW(),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pedidos_exame_paciente ON pedidos_exame(paciente_cpf);

-- Tabela de evoluções (registro de consultas sequenciais)
CREATE TABLE IF NOT EXISTS evolucoes_prontuario (
  id              BIGSERIAL PRIMARY KEY,
  prontuario_id   BIGINT REFERENCES prontuarios(id) ON DELETE CASCADE,
  medico_id       BIGINT REFERENCES medicos(id),
  texto           TEXT NOT NULL,
  data_evolucao   DATE DEFAULT CURRENT_DATE,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE receitas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "receitas_service_all" ON receitas FOR ALL USING (true);

ALTER TABLE atestados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "atestados_service_all" ON atestados FOR ALL USING (true);

ALTER TABLE pedidos_exame ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pedidos_exame_service_all" ON pedidos_exame FOR ALL USING (true);

ALTER TABLE evolucoes_prontuario ENABLE ROW LEVEL SECURITY;
CREATE POLICY "evolucoes_service_all" ON evolucoes_prontuario FOR ALL USING (true);
