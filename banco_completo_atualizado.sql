-- ============================================================
-- Saúde 360 — Schema Completo para Supabase
-- Execute TODO este arquivo no SQL Editor do Supabase
-- ============================================================

-- ── Tabela de usuários (autenticação própria — não usa Supabase Auth) ──────────
CREATE TABLE IF NOT EXISTS usuarios (
  id            BIGSERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  email         VARCHAR(200) NOT NULL UNIQUE,
  senha_hash    TEXT NOT NULL,
  cpf           VARCHAR(11)  UNIQUE,      -- apenas pacientes
  crm           VARCHAR(20)  UNIQUE,      -- apenas médicos
  whatsapp      VARCHAR(20),
  papel         VARCHAR(20) NOT NULL DEFAULT 'paciente'
                  CHECK (papel IN ('paciente', 'medico', 'admin')),
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_cpf   ON usuarios(cpf) WHERE cpf IS NOT NULL;

-- ── Médicos ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS medicos (
  id              BIGSERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  especialidade   VARCHAR(100) NOT NULL,
  crm             VARCHAR(20),
  foto_url        TEXT,
  mini_curriculo  TEXT,
  nps_medio       NUMERIC(4,2) DEFAULT 0,
  total_avaliacoes INTEGER DEFAULT 0,
  convenios       TEXT[],
  ativo           BOOLEAN DEFAULT TRUE
);

INSERT INTO medicos (nome, especialidade, crm, mini_curriculo, nps_medio, total_avaliacoes, convenios) VALUES
  ('Dr. Carlos Silva',   'Cardiologia',  'CRM/CE-12345', 'Especialista em cardiologia com 15 anos de experiência.', 9.2, 48, ARRAY['Unimed','Bradesco Saúde','SulAmérica']),
  ('Dra. Ana Souza',     'Dermatologia', 'CRM/CE-23456', 'Dermatologista com foco em dermatologia clínica e cosmética.', 8.8, 32, ARRAY['Unimed','Amil']),
  ('Dr. Pedro Lima',     'Ortopedia',    'CRM/CE-34567', 'Ortopedista especializado em coluna e joelho.', 9.5, 61, ARRAY['Bradesco Saúde','Porto Seguro']),
  ('Dra. Mariana Costa', 'Pediatria',    'CRM/CE-45678', 'Pediatra com especialização em neonatologia.', 9.8, 87, ARRAY['Unimed','Hapvida','Amil'])
ON CONFLICT DO NOTHING;

-- ── Convênios ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS convenios (
  id   BIGSERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE
);
INSERT INTO convenios (nome) VALUES
  ('Unimed'),('Bradesco Saúde'),('SulAmérica'),('Amil'),('Hapvida'),('Porto Seguro'),('Particular')
ON CONFLICT DO NOTHING;

-- ── Agenda Slots ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agenda_slots (
  id              BIGSERIAL PRIMARY KEY,
  medico_id       BIGINT REFERENCES medicos(id) ON DELETE CASCADE,
  data            DATE NOT NULL,
  hora_inicio     TIME NOT NULL,
  hora_fim        TIME NOT NULL,
  status          VARCHAR(20) DEFAULT 'LIVRE',
  motivo_bloqueio TEXT,
  bloqueado_por   VARCHAR(100),
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(medico_id, data, hora_inicio)
);

-- Slots de exemplo para os próximos 7 dias
INSERT INTO agenda_slots (medico_id, data, hora_inicio, hora_fim, status)
SELECT
  m.id,
  (CURRENT_DATE + (d || ' days')::interval)::date,
  (h || ':00')::time,
  ((h + 1) || ':00')::time,
  'LIVRE'
FROM medicos m
CROSS JOIN generate_series(1, 7) d
CROSS JOIN generate_series(8, 17) h
WHERE m.ativo = true
ON CONFLICT DO NOTHING;

-- ── Agendamentos ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agendamentos (
  id              BIGSERIAL PRIMARY KEY,
  nome            VARCHAR(100) NOT NULL,
  cpf             VARCHAR(14)  NOT NULL,
  whatsapp        VARCHAR(20),
  medico_id       BIGINT REFERENCES medicos(id),
  slot_id         BIGINT REFERENCES agenda_slots(id),
  data_consulta   DATE,
  horario         TIME,
  status          VARCHAR(30) DEFAULT 'PENDENTE_PAGAMENTO',
  protocolo       VARCHAR(40) UNIQUE,
  qr_token        VARCHAR(100),
  tipo_consulta   VARCHAR(20) DEFAULT 'PRESENCIAL',
  meet_link       TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Status Log ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS status_log (
  id              BIGSERIAL PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  status_anterior VARCHAR(30),
  status_novo     VARCHAR(30),
  alterado_por    VARCHAR(100),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Pagamentos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagamentos (
  id              BIGSERIAL PRIMARY KEY,
  nome            VARCHAR(100)  NOT NULL,
  cpf             VARCHAR(14)   NOT NULL,
  valor           NUMERIC(10,2) NOT NULL,
  codigo_pix      VARCHAR(100)  NOT NULL,
  status          VARCHAR(20)   DEFAULT 'PENDENTE',
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  gerado_por      VARCHAR(50)   DEFAULT 'ONLINE',
  criado_em       TIMESTAMPTZ   DEFAULT NOW(),
  expira_em       TIMESTAMPTZ   NOT NULL
);

-- ── Triagens ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS triagens (
  id              BIGSERIAL PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  perguntas       JSONB,
  resumo_ia       TEXT,
  status          VARCHAR(20) DEFAULT 'PENDENTE',
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  respondida_em   TIMESTAMPTZ
);

-- ── Prontuários ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prontuarios (
  id                BIGSERIAL PRIMARY KEY,
  agendamento_id    BIGINT REFERENCES agendamentos(id),
  paciente_cpf      VARCHAR(14),
  medico_id         BIGINT REFERENCES medicos(id),
  queixa            TEXT,
  diagnostico       TEXT,
  conduta           TEXT,
  cid               VARCHAR(20),
  necessita_retorno BOOLEAN DEFAULT FALSE,
  prazo_retorno     INTEGER,
  assinado          BOOLEAN DEFAULT FALSE,
  assinado_em       TIMESTAMPTZ,
  versao            INTEGER DEFAULT 1,
  criado_em         TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Indicadores Clínicos ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS indicadores_clinicos (
  id            BIGSERIAL PRIMARY KEY,
  paciente_cpf  VARCHAR(14) NOT NULL,
  medico_id     BIGINT REFERENCES medicos(id),
  tipo          VARCHAR(20) NOT NULL,
  valor_1       NUMERIC(6,2),
  valor_2       NUMERIC(6,2),
  unidade       VARCHAR(10),
  registrado_em DATE NOT NULL DEFAULT CURRENT_DATE,
  criado_em     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Documentos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS documentos (
  id              BIGSERIAL PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  paciente_cpf    VARCHAR(14),
  medico_id       BIGINT REFERENCES medicos(id),
  tipo            VARCHAR(20) NOT NULL,
  titulo          VARCHAR(200),
  arquivo_url     TEXT,
  hash_sha256     VARCHAR(64),
  assinado        BOOLEAN DEFAULT FALSE,
  assinado_em     TIMESTAMPTZ,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Avaliações NPS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS avaliacoes_nps (
  id              BIGSERIAL PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES agendamentos(id) UNIQUE,
  medico_id       BIGINT REFERENCES medicos(id),
  paciente_cpf    VARCHAR(14),
  nota            INTEGER CHECK (nota >= 0 AND nota <= 10),
  comentario      TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lista de Espera ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lista_espera (
  id          BIGSERIAL PRIMARY KEY,
  medico_id   BIGINT REFERENCES medicos(id),
  data        DATE,
  horario     TIME,
  nome        VARCHAR(100),
  whatsapp    VARCHAR(20),
  posicao     INTEGER,
  status      VARCHAR(20) DEFAULT 'AGUARDANDO',
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Notificações Log ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificacoes_log (
  id              BIGSERIAL PRIMARY KEY,
  tipo            VARCHAR(50),
  canal           VARCHAR(20),
  destinatario    VARCHAR(100),
  status          VARCHAR(20) DEFAULT 'ENVIADO',
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Lembretes de Retorno ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS lembretes_retorno (
  id              BIGSERIAL PRIMARY KEY,
  prontuario_id   BIGINT REFERENCES prontuarios(id),
  agendamento_id  BIGINT REFERENCES agendamentos(id),
  paciente_nome   VARCHAR(100),
  paciente_cpf    VARCHAR(14),
  medico_id       BIGINT REFERENCES medicos(id),
  prazo_data      DATE,
  status          VARCHAR(20) DEFAULT 'PENDENTE',
  resposta        VARCHAR(20),
  criado_em       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Exames e Preparos ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exames_preparos (
  id            BIGSERIAL PRIMARY KEY,
  nome_exame    VARCHAR(200) NOT NULL,
  preparo       TEXT NOT NULL,
  palavras_chave TEXT[],
  ativo         BOOLEAN DEFAULT TRUE,
  criado_em     TIMESTAMPTZ DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO exames_preparos (nome_exame, preparo, palavras_chave) VALUES
  ('Hemograma Completo', 'Jejum de 4 horas. Pode tomar água normalmente.', ARRAY['hemograma','sangue']),
  ('Glicose em Jejum', 'Jejum de 8 a 12 horas. Pode tomar água. Não praticar exercícios antes.', ARRAY['glicose','glicemia']),
  ('Colesterol Total e Frações', 'Jejum de 12 horas. Evitar atividade física intensa 24h antes.', ARRAY['colesterol','triglicerídeos']),
  ('Ultrassonografia Abdominal', 'Jejum de 4 a 6 horas. Beber 1 litro de água 1 hora antes sem urinar.', ARRAY['ultrassom','abdominal']),
  ('Eletrocardiograma (ECG)', 'Não é necessário jejum. Evitar cremes ou loções no tórax.', ARRAY['ecg','coração']),
  ('Endoscopia Digestiva Alta', 'Jejum de 8 horas. Não fumar no dia. Trazer acompanhante.', ARRAY['endoscopia','estômago'])
ON CONFLICT DO NOTHING;

-- ── FAQ Chatbot ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chatbot_faq (
  id             BIGSERIAL PRIMARY KEY,
  pergunta       TEXT NOT NULL,
  resposta       TEXT NOT NULL,
  palavras_chave TEXT[],
  ativo          BOOLEAN DEFAULT TRUE,
  criado_em      TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO chatbot_faq (pergunta, resposta, palavras_chave) VALUES
  ('Quais são os horários de atendimento?', 'Atendemos de segunda a sexta das 7h às 19h e sábados das 7h às 13h.', ARRAY['horário','funcionamento']),
  ('Como cancelo minha consulta?', 'Pelo portal do paciente ou via WhatsApp com até 12 horas de antecedência.', ARRAY['cancelar','desmarcar']),
  ('Quais convênios são aceitos?', 'Unimed, Bradesco Saúde, SulAmérica, Amil, Hapvida, Porto Seguro e particular.', ARRAY['convênio','plano']),
  ('Como agendar uma consulta?', 'Acesse nossa vitrine, escolha o médico e o horário disponível.', ARRAY['agendar','marcar'])
ON CONFLICT DO NOTHING;

-- ── Usuários de teste (TROQUE AS SENHAS EM PRODUÇÃO!) ─────────────────────────
-- ⚠️  Os hashes abaixo são PLACEHOLDERS.
-- Execute o script correto para gerar hashes reais:
--   node scripts/seed_usuarios_teste.js
--
-- Credenciais de teste:
--   Paciente: paciente@teste.com / Paciente@123
--   Médico:   carlos@clinica.com / Medico@123
--   Admin:    admin@clinica.com  / Admin@123
--
-- Se preferir inserir pelo SQL Editor, gere os hashes com:
--   node -e "const b=require('bcrypt'); b.hash('Medico@123',12).then(console.log)"

INSERT INTO usuarios (nome, email, senha_hash, cpf, papel)
VALUES ('Paciente Teste', 'paciente@teste.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMbJOFACi9KXXFqrRWKBm1rFYi',
  '12345678901', 'paciente')
ON CONFLICT (email) DO NOTHING;

-- Médico teste (Dr. Carlos Silva) — senha: Medico@123
INSERT INTO usuarios (nome, email, senha_hash, crm, papel)
VALUES ('Dr. Carlos Silva', 'carlos@clinica.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMbJOFACi9KXXFqrRWKBm1rFYi',
  'CRM/CE-12345', 'medico')
ON CONFLICT (email) DO NOTHING;

-- Admin/Recepção — senha: Admin@123
INSERT INTO usuarios (nome, email, senha_hash, papel)
VALUES ('Administrador', 'admin@clinica.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMbJOFACi9KXXFqrRWKBm1rFYi',
  'admin')
ON CONFLICT (email) DO NOTHING;

-- ── Row Level Security (RLS) — desabilite se usar service_role ─────────────────
-- O backend usa service_role key que bypassa RLS automaticamente.
-- Se quiser habilitar RLS para segurança adicional, descomente abaixo:
-- ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;
-- (configure as políticas conforme necessidade)

-- ── Tabela de tokens de redefinição de senha ───────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token       CHAR(64) NOT NULL UNIQUE,
  expira_em   TIMESTAMPTZ NOT NULL,
  usado       BOOLEAN NOT NULL DEFAULT FALSE,
  criado_em   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token);
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
-- 002_lista_espera.sql
-- Tabela para gerenciamento da Lista de Espera por horário ou médico.

CREATE TABLE IF NOT EXISTS public.lista_espera (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  paciente_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
  medico_id BIGINT REFERENCES public.usuarios(id) ON DELETE CASCADE,
  data_alvo DATE NOT NULL,
  horario_alvo TIME, -- Opcional: pode querer qualquer horário no dia
  status VARCHAR(20) DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO', 'NOTIFICADO', 'CONCLUIDO', 'EXPIRADO', 'CANCELADO')),
  notificado_em TIMESTAMP WITH TIME ZONE,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Como o backend (app.js) utiliza a service_role_key e JWT próprio, RLS com auth.uid()
-- falharia (tipos incompatíveis e auth.uid não existe no contexto do service_role_key).
ALTER TABLE public.lista_espera ENABLE ROW LEVEL SECURITY;

CREATE POLICY "lista_espera_allow_all_service" ON public.lista_espera FOR ALL USING (true);
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

-- ============================================================
-- Migration 002: tipos_consulta, notificacoes, avaliacoes_nps
-- Execute no SQL Editor do Supabase
-- ============================================================

-- Tipos de consulta por médico
ALTER TABLE medicos ADD COLUMN IF NOT EXISTS tipos_consulta TEXT[] DEFAULT ARRAY['PRESENCIAL'];
UPDATE medicos SET tipos_consulta = ARRAY['PRESENCIAL', 'TELECONSULTA'] WHERE tipos_consulta IS NULL OR array_length(tipos_consulta, 1) = 0;

-- Notificações internas
CREATE TABLE IF NOT EXISTS notificacoes (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  BIGINT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  titulo      VARCHAR(200) NOT NULL,
  mensagem    TEXT,
  tipo        VARCHAR(20) DEFAULT 'info',
  lida        BOOLEAN DEFAULT FALSE,
  link        TEXT,
  criado_em   TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_usuario_lida ON notificacoes(usuario_id, lida);

-- Avaliações NPS dos médicos
CREATE TABLE IF NOT EXISTS avaliacoes_nps (
  id              BIGSERIAL PRIMARY KEY,
  agendamento_id  BIGINT REFERENCES agendamentos(id) ON DELETE CASCADE,
  medico_id       BIGINT REFERENCES medicos(id) ON DELETE CASCADE,
  paciente_id     BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  nota            SMALLINT NOT NULL CHECK (nota BETWEEN 1 AND 5),
  comentario      TEXT,
  criado_em       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agendamento_id)
);

