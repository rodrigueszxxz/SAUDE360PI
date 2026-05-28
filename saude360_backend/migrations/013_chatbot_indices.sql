-- ============================================================
-- Migration 013: Histórico do Chatbot
-- Saúde 360
-- Execute no SQL Editor do Supabase
-- ============================================================

CREATE TABLE IF NOT EXISTS chatbot_historico (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT REFERENCES usuarios(id) ON DELETE CASCADE,
  role        VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  mensagem    TEXT NOT NULL,
  intent      VARCHAR(50),
  confianca   NUMERIC(5,4),
  sessao_id   UUID DEFAULT gen_random_uuid(),
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chatbot_usuario   ON chatbot_historico(usuario_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_sessao    ON chatbot_historico(sessao_id);
CREATE INDEX IF NOT EXISTS idx_chatbot_criado_em ON chatbot_historico(criado_em DESC);

ALTER TABLE chatbot_historico ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chatbot_hist_service_all" ON chatbot_historico FOR ALL USING (true);

-- Adicionar campo convenio_titular que faltava na migration 003
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS convenio_titular TEXT;

-- Índice para agendamentos por médico+data (melhora painel de recepção)
CREATE INDEX IF NOT EXISTS idx_ag_medico_data ON agendamentos(medico_id, data_consulta);
CREATE INDEX IF NOT EXISTS idx_ag_data_status  ON agendamentos(data_consulta, status);
CREATE INDEX IF NOT EXISTS idx_ag_cpf_status   ON agendamentos(cpf, status);

-- Índice para pagamentos
CREATE INDEX IF NOT EXISTS idx_pag_cpf_status  ON pagamentos(cpf, status);
CREATE INDEX IF NOT EXISTS idx_pag_ag_id       ON pagamentos(agendamento_id);
CREATE INDEX IF NOT EXISTS idx_pag_criado_em   ON pagamentos(criado_em DESC);

-- Índice para prontuários
CREATE INDEX IF NOT EXISTS idx_pront_cpf       ON prontuarios(paciente_cpf);
CREATE INDEX IF NOT EXISTS idx_pront_medico    ON prontuarios(medico_id);
CREATE INDEX IF NOT EXISTS idx_pront_ag_id     ON prontuarios(agendamento_id);
