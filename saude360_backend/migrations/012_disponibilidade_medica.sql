-- ============================================================
-- Migration 012: Disponibilidade Médica
-- Saúde 360
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Configuração de disponibilidade semanal do médico
CREATE TABLE IF NOT EXISTS disponibilidade_medica (
  id                    BIGSERIAL PRIMARY KEY,
  medico_id             BIGINT NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana            SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  -- 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
  hora_inicio           TIME NOT NULL,
  hora_fim              TIME NOT NULL,
  duracao_consulta_min  SMALLINT NOT NULL DEFAULT 30,
  max_consultas_dia     SMALLINT DEFAULT NULL,  -- NULL = sem limite além da grade
  intervalo_entre_min   SMALLINT DEFAULT 0,     -- minutos de folga entre consultas
  modalidade            VARCHAR(20) DEFAULT 'AMBOS' CHECK (modalidade IN ('PRESENCIAL', 'TELECONSULTA', 'AMBOS')),
  ativo                 BOOLEAN DEFAULT TRUE,
  criado_em             TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medico_id, dia_semana, hora_inicio)
);

-- Pausas dentro do dia (ex: almoço 12h-14h)
CREATE TABLE IF NOT EXISTS pausas_medico (
  id                BIGSERIAL PRIMARY KEY,
  medico_id         BIGINT NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  dia_semana        SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio_pausa TIME NOT NULL,
  hora_fim_pausa    TIME NOT NULL,
  descricao         VARCHAR(100) DEFAULT 'Pausa',
  ativo             BOOLEAN DEFAULT TRUE,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

-- Bloqueios pontuais (férias, feriados, ausências)
CREATE TABLE IF NOT EXISTS bloqueios_agenda (
  id              BIGSERIAL PRIMARY KEY,
  medico_id       BIGINT NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  data_inicio     DATE NOT NULL,
  data_fim        DATE NOT NULL,
  hora_inicio     TIME,        -- NULL = bloqueia dia inteiro
  hora_fim        TIME,        -- NULL = bloqueia dia inteiro
  motivo          VARCHAR(100) NOT NULL DEFAULT 'Bloqueio',
  tipo            VARCHAR(20) DEFAULT 'AUSENCIA' CHECK (tipo IN ('FERIAS', 'FERIADO', 'AUSENCIA', 'MANUTENCAO')),
  criado_por      BIGINT REFERENCES usuarios(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  CHECK (data_fim >= data_inicio)
);

-- Feriados nacionais
CREATE TABLE IF NOT EXISTS feriados (
  id          BIGSERIAL PRIMARY KEY,
  data        DATE NOT NULL UNIQUE,
  nome        VARCHAR(100) NOT NULL,
  tipo        VARCHAR(20) DEFAULT 'NACIONAL' CHECK (tipo IN ('NACIONAL', 'ESTADUAL', 'MUNICIPAL')),
  uf          CHAR(2),   -- estado (para estaduais/municipais)
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO feriados (data, nome, tipo) VALUES
  ('2026-01-01', 'Confraternização Universal', 'NACIONAL'),
  ('2026-04-21', 'Tiradentes', 'NACIONAL'),
  ('2026-05-01', 'Dia do Trabalho', 'NACIONAL'),
  ('2026-09-07', 'Independência do Brasil', 'NACIONAL'),
  ('2026-10-12', 'Nossa Senhora Aparecida', 'NACIONAL'),
  ('2026-11-02', 'Finados', 'NACIONAL'),
  ('2026-11-15', 'Proclamação da República', 'NACIONAL'),
  ('2026-12-25', 'Natal', 'NACIONAL')
ON CONFLICT (data) DO NOTHING;

-- Configurações avançadas por médico
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS antecedencia_min_horas    SMALLINT DEFAULT 2;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS antecedencia_max_dias      SMALLINT DEFAULT 90;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS permite_encaixe            BOOLEAN DEFAULT FALSE;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS permite_retorno            BOOLEAN DEFAULT TRUE;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS duracao_retorno_min        SMALLINT DEFAULT 20;
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS usuario_id                 BIGINT REFERENCES usuarios(id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_disp_medico     ON disponibilidade_medica(medico_id, ativo);
CREATE INDEX IF NOT EXISTS idx_pausas_medico   ON pausas_medico(medico_id, dia_semana);
CREATE INDEX IF NOT EXISTS idx_bloqueios_data  ON bloqueios_agenda(medico_id, data_inicio, data_fim);
CREATE INDEX IF NOT EXISTS idx_feriados_data   ON feriados(data);

-- RLS
ALTER TABLE disponibilidade_medica ENABLE ROW LEVEL SECURITY;
CREATE POLICY "disp_medica_service_all" ON disponibilidade_medica FOR ALL USING (true);

ALTER TABLE pausas_medico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pausas_service_all" ON pausas_medico FOR ALL USING (true);

ALTER TABLE bloqueios_agenda ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bloqueios_service_all" ON bloqueios_agenda FOR ALL USING (true);

ALTER TABLE feriados ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feriados_service_all" ON feriados FOR ALL USING (true);
