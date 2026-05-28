const historicoRepository = require('../repositories/historicoRepository');

// Clamp seguro para paginação — evita que o cliente consulte volumes arbitrários
function clampPage(val, def = 1)   { return Math.max(1, parseInt(val) || def); }
function clampLimit(val, def = 20) { return Math.min(100, Math.max(1, parseInt(val) || def)); }

async function buscarHistoricoMedico(paciente_cpf, query) {
  if (!paciente_cpf) throw new Error('CPF do paciente é obrigatório');
  return historicoRepository.buscarHistoricoMedico(paciente_cpf, {
    page:        clampPage(query.page, 1),
    limit:       clampLimit(query.limit, 20),
    tipo:        query.tipo        || null,
    data_inicio: query.data_inicio || null,
    data_fim:    query.data_fim    || null,
    medico_id:   query.medico_id   || null,
  });
}

async function buscarTimeline(paciente_cpf, query) {
  if (!paciente_cpf) throw new Error('CPF do paciente é obrigatório');
  return historicoRepository.buscarTimeline(paciente_cpf, {
    page:  clampPage(query.page, 1),
    limit: clampLimit(query.limit, 30),
  });
}

module.exports = { buscarHistoricoMedico, buscarTimeline };
