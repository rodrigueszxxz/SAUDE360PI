-- ============================================================
-- Migration 009 — Ajustes finais para funcionalidades críticas
-- Saúde 360 | Data: 2026-05-11
-- ============================================================

-- 1. Campo convenio_titular na tabela de usuários
--    (nome do titular do plano — obrigatório para validação de convênio)
ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS convenio_titular TEXT;

-- 2. Status CHECKIN_REALIZADO no enum de status de agendamentos
--    (substitui AGUARDANDO no check-in QR para evitar ambiguidade)
DO $$
BEGIN
  -- Adiciona 'CHECKIN_REALIZADO' ao enum se ele existir como tipo enum
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'status_agendamento'
  ) THEN
    ALTER TYPE status_agendamento ADD VALUE IF NOT EXISTS 'CHECKIN_REALIZADO';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Se o status for TEXT (não enum), a inserção já funciona normalmente.
-- Apenas atualizamos o check constraint se existir:
DO $$
BEGIN
  -- Remove constraint antiga que não incluía CHECKIN_REALIZADO
  ALTER TABLE agendamentos
    DROP CONSTRAINT IF EXISTS agendamentos_status_check;

  -- Adiciona nova constraint com o status atualizado
  ALTER TABLE agendamentos
    ADD CONSTRAINT agendamentos_status_check
    CHECK (status IN (
      'PENDENTE_PAGAMENTO',
      'CONFIRMADO',
      'AGUARDANDO',
      'CHECKIN_REALIZADO',
      'EM_ATENDIMENTO',
      'CONCLUIDO',
      'CANCELADO',
      'NO_SHOW'
    ));
EXCEPTION WHEN undefined_column THEN NULL;
END $$;

-- 3. Tabela de log de notificações (deduplicação de lembretes automáticos)
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id              BIGSERIAL PRIMARY KEY,
  tipo            TEXT NOT NULL,          -- 'LEMBRETE_24H', 'LEMBRETE_5H', 'CANCELAMENTO', etc.
  canal           TEXT NOT NULL DEFAULT 'INTERNO',
  destinatario    TEXT,                   -- CPF ou e-mail
  status          TEXT NOT NULL DEFAULT 'ENVIADO',
  agendamento_id  BIGINT REFERENCES agendamentos(id) ON DELETE CASCADE,
  criado_em       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_log_agendamento ON notificacoes_log(agendamento_id, tipo);

-- 4. Índice para busca de QR token (frequente em check-in)
CREATE INDEX IF NOT EXISTS idx_agendamentos_qr_token
  ON agendamentos(qr_token)
  WHERE qr_token IS NOT NULL;

-- 5. Índice para busca de agendamentos por CPF e data (meus-agendamentos)
CREATE INDEX IF NOT EXISTS idx_agendamentos_cpf_data
  ON agendamentos(cpf, data_consulta DESC);

-- 6. Índice para busca de pagamentos por agendamento_id
CREATE INDEX IF NOT EXISTS idx_pagamentos_agendamento_id
  ON pagamentos(agendamento_id);

-- 7. Atualiza tipos_consulta dos médicos existentes que têm NULL
--    (padrão: PRESENCIAL para todos que não têm configuração)
UPDATE medicos
  SET tipos_consulta = ARRAY['PRESENCIAL']
  WHERE tipos_consulta IS NULL OR tipos_consulta = '{}';

-- ============================================================
-- Verificação
-- ============================================================
SELECT
  column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'usuarios'
  AND column_name IN ('convenio_operadora', 'convenio_numero', 'convenio_titular', 'convenio_validade', 'convenio_tipo')
ORDER BY column_name;
