const repository = require('../repositories/listaEsperaRepository');

async function entrarNaFila(paciente_nome, paciente_whatsapp, medico_id, data, horario) {
  return repository.adicionar({ paciente_nome, paciente_whatsapp, medico_id, data, horario });
}

async function listarFilaMedico(medico_id, data) {
  return repository.listarFilaMedico(medico_id, data);
}

async function acionarFilaSeNecessario(medico_id, data, horario) {
  const proximo = await repository.buscarProximo(medico_id, data, horario);
  if (proximo) {
    await repository.atualizarStatus(proximo.id, 'NOTIFICADO');
  }
}

module.exports = { entrarNaFila, listarFilaMedico, acionarFilaSeNecessario };
