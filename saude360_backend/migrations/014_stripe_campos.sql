-- ============================================================
-- Migration 014: Campos Stripe na tabela pagamentos
-- Saúde 360
-- Execute no SQL Editor do Supabase
-- ============================================================

ALTER TABLE pagamentos
  ADD COLUMN IF NOT EXISTS stripe_session_id      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS stripe_payment_intent  VARCHAR(255),
  ADD COLUMN IF NOT EXISTS gateway                VARCHAR(20) DEFAULT 'INTERNO',
  ADD COLUMN IF NOT EXISTS atualizado_em          TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_gateway_check;

ALTER TABLE pagamentos
  ADD CONSTRAINT pagamentos_gateway_check
  CHECK (gateway IN ('STRIPE', 'INTERNO'));

CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_session
  ON pagamentos(stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_stripe_intent
  ON pagamentos(stripe_payment_intent)
  WHERE stripe_payment_intent IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_pagamentos_gateway
  ON pagamentos(gateway);

CREATE INDEX IF NOT EXISTS idx_pagamentos_status_gateway
  ON pagamentos(status, gateway);

ALTER TABLE pagamentos
  DROP CONSTRAINT IF EXISTS pagamentos_status_check;

ALTER TABLE pagamentos
  ADD CONSTRAINT pagamentos_status_check
  CHECK (status IN ('PENDENTE', 'PAGO', 'EXPIRADO', 'REEMBOLSADO', 'CREDITO_RETIDO', 'FALHOU', 'CANCELADO'));

UPDATE pagamentos
  SET gateway = 'INTERNO'
  WHERE gateway IS NULL;
