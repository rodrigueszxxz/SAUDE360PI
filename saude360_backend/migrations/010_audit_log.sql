-- ============================================================
-- Migration 010: Sistema de Auditoria LGPD
-- Saúde 360
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Tabela principal de auditoria
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  usuario_email   VARCHAR(200),
  usuario_papel   VARCHAR(20),
  acao            VARCHAR(100) NOT NULL,  -- ex: LOGIN, LOGOUT, VER_PRONTUARIO, CANCELAR_AGENDAMENTO
  entidade        VARCHAR(50),            -- ex: agendamentos, prontuarios, usuarios
  entidade_id     VARCHAR(100),           -- ID do registro afetado
  descricao       TEXT,                   -- descrição legível da ação
  ip              VARCHAR(45),            -- IPv4 ou IPv6
  user_agent      TEXT,
  dados_anteriores JSONB,                 -- estado antes da mudança (para edições)
  dados_novos      JSONB,                 -- estado após a mudança
  status          VARCHAR(20) DEFAULT 'SUCESSO' CHECK (status IN ('SUCESSO', 'FALHA', 'NEGADO')),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_usuario    ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_acao       ON audit_log(acao);
CREATE INDEX IF NOT EXISTS idx_audit_entidade   ON audit_log(entidade, entidade_id);
CREATE INDEX IF NOT EXISTS idx_audit_criado_em  ON audit_log(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_audit_ip         ON audit_log(ip);

-- Tabela de consentimento LGPD
CREATE TABLE IF NOT EXISTS lgpd_consentimentos (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL,   -- ex: POLITICA_PRIVACIDADE, DADOS_SAUDE, MARKETING
  versao          VARCHAR(20) NOT NULL DEFAULT '1.0',
  aceito          BOOLEAN NOT NULL DEFAULT FALSE,
  ip              VARCHAR(45),
  user_agent      TEXT,
  aceito_em       TIMESTAMPTZ,
  revogado_em     TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, tipo, versao)
);

CREATE INDEX IF NOT EXISTS idx_lgpd_usuario ON lgpd_consentimentos(usuario_id);

-- Tabela para requisições LGPD (portabilidade, exclusão, correção)
CREATE TABLE IF NOT EXISTS lgpd_requisicoes (
  id              BIGSERIAL PRIMARY KEY,
  usuario_id      BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo            VARCHAR(50) NOT NULL CHECK (tipo IN (
                    'EXPORTAR_DADOS', 'EXCLUIR_DADOS', 'CORRIGIR_DADOS',
                    'REVOGAR_CONSENTIMENTO', 'RELATORIO_ACESSO'
                  )),
  status          VARCHAR(20) DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'EM_PROCESSAMENTO', 'CONCLUIDO', 'REJEITADO')),
  motivo          TEXT,
  resposta        TEXT,
  dados_exportados JSONB,
  solicitado_em   TIMESTAMPTZ DEFAULT NOW(),
  concluido_em    TIMESTAMPTZ,
  prazo_legal     TIMESTAMPTZ GENERATED ALWAYS AS (solicitado_em + INTERVAL '15 days') STORED
);

CREATE INDEX IF NOT EXISTS idx_lgpd_req_usuario ON lgpd_requisicoes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_lgpd_req_status  ON lgpd_requisicoes(status);

-- RLS permissiva (service_role bypassa)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "audit_log_service_all" ON audit_log FOR ALL USING (true);

ALTER TABLE lgpd_consentimentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lgpd_consent_service_all" ON lgpd_consentimentos FOR ALL USING (true);

ALTER TABLE lgpd_requisicoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "lgpd_req_service_all" ON lgpd_requisicoes FOR ALL USING (true);
