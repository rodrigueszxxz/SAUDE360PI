-- ============================================================
-- Migration 001: Tabela de médicos favoritos
-- Saúde 360
-- ============================================================

CREATE TABLE IF NOT EXISTS medicos_favoritos (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  medico_id   BIGINT NOT NULL REFERENCES medicos(id) ON DELETE CASCADE,
  criado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(usuario_id, medico_id)
);

CREATE INDEX IF NOT EXISTS idx_fav_usuario ON medicos_favoritos(usuario_id);
CREATE INDEX IF NOT EXISTS idx_fav_medico  ON medicos_favoritos(medico_id);
