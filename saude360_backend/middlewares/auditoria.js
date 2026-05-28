/**
 * auditoria.js — Saúde 360
 * Middleware de auditoria LGPD.
 * Registra automaticamente ações sensíveis na tabela audit_log.
 *
 * Uso: app.use('/rota', autenticar, auditarAcao('ACAO', 'entidade'), handler)
 */
const supabase = require('../config/db');

async function registrarAuditoria({
  usuario_id,
  usuario_email,
  usuario_papel,
  acao,
  entidade,
  entidade_id,
  descricao,
  ip,
  user_agent,
  dados_anteriores,
  dados_novos,
  status = 'SUCESSO',
}) {
  try {
    await supabase.from('audit_log').insert([{
      usuario_id:       usuario_id       || null,
      usuario_email:    usuario_email    || null,
      usuario_papel:    usuario_papel    || null,
      acao,
      entidade:         entidade         || null,
      entidade_id:      entidade_id ? String(entidade_id) : null,
      descricao:        descricao        || null,
      ip:               ip               || null,
      user_agent:       user_agent       || null,
      dados_anteriores: dados_anteriores || null,
      dados_novos:      dados_novos      || null,
      status,
    }]);
  } catch (err) {
    // Nunca bloqueia o fluxo — apenas loga internamente
    console.error('[auditoria] Falha ao registrar:', err.message);
  }
}

function extrairIP(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    req.headers['x-real-ip'] ||
    req.connection?.remoteAddress ||
    req.socket?.remoteAddress ||
    'desconhecido'
  );
}

/**
 * Middleware gerador — retorna um handler Express que registra a ação.
 *
 * @param {string} acao        - Código da ação (ex: 'VER_PRONTUARIO')
 * @param {string} entidade    - Nome da entidade (ex: 'prontuarios')
 * @param {Function} [getId]   - Função opcional para extrair o ID da entidade de req
 */
function auditarAcao(acao, entidade = null, getId = null) {
  return async (req, _res, next) => {
    const usuario = req.usuario;
    const entidade_id = getId ? getId(req) : (req.params.id || req.params.agendamento_id || req.params.cpf || null);

    // Registra de forma assíncrona sem await — não bloqueia a requisição
    registrarAuditoria({
      usuario_id:    usuario?.id,
      usuario_email: usuario?.email,
      usuario_papel: usuario?.papel,
      acao,
      entidade,
      entidade_id,
      descricao:     `${req.method} ${req.originalUrl}`,
      ip:            extrairIP(req),
      user_agent:    req.headers['user-agent'],
    }).catch(() => {});

    next();
  };
}

async function auditarFalhaLogin(email, ip, user_agent) {
  await registrarAuditoria({
    usuario_email: email,
    acao:         'LOGIN_FALHA',
    entidade:     'usuarios',
    descricao:    `Tentativa de login falhou para ${email}`,
    ip,
    user_agent,
    status:       'FALHA',
  });
}

async function auditarAcessoNegado(req, acao) {
  const usuario = req.usuario;
  await registrarAuditoria({
    usuario_id:    usuario?.id,
    usuario_email: usuario?.email,
    usuario_papel: usuario?.papel,
    acao:          acao || 'ACESSO_NEGADO',
    entidade:      null,
    descricao:     `Acesso negado: ${req.method} ${req.originalUrl}`,
    ip:            extrairIP(req),
    user_agent:    req.headers['user-agent'],
    status:        'NEGADO',
  });
}

module.exports = {
  registrarAuditoria,
  auditarAcao,
  auditarFalhaLogin,
  auditarAcessoNegado,
  extrairIP,
};
