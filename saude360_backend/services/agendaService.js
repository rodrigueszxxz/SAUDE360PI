const agendaRepository = require('../repositories/agendaRepository');

async function listarSlots(query) {
  return agendaRepository.listarSlots({
    medico_id:  query.medico_id  || null,
    data:        query.data       || null,
    disponivel:  query.disponivel || null,
  });
}

async function bloquear(body) {
  const { medico_id, data, hora_inicio, hora_fim, motivo, bloqueado_por } = body;

  if (!medico_id || !data || !hora_inicio) {
    throw new Error('medico_id, data e hora_inicio são obrigatórios');
  }

  return agendaRepository.bloquear({ medico_id, data, hora_inicio, hora_fim, motivo, bloqueado_por });
}

async function desbloquear(id) {
  if (!id) throw new Error('ID do slot é obrigatório');
  return agendaRepository.desbloquear(id);
}

async function mover({ agendamento_id, novo_slot_id }) {
  if (!agendamento_id || !novo_slot_id) {
    throw new Error('agendamento_id e novo_slot_id são obrigatórios');
  }
  return agendaRepository.moverSlot(agendamento_id, novo_slot_id);
}

module.exports = { listarSlots, bloquear, desbloquear, mover };
