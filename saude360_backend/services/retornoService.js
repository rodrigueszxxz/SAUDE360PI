const retornoRepository = require('../repositories/retornoRepository');

async function sugerirRetorno({ prontuario_id, agendamento_id, paciente_nome, paciente_cpf, medico_id, prazo_dias }) {
  if (!agendamento_id || !paciente_cpf || !medico_id) {
    throw new Error('agendamento_id, paciente_cpf e medico_id são obrigatórios');
  }

  const lembrete = await retornoRepository.criarLembrete({
    prontuario_id,
    agendamento_id,
    paciente_nome,
    paciente_cpf,
    medico_id,
    prazo_dias: prazo_dias || 30,
  });

  // TODO (Vito): enviar proposta de retorno via WhatsApp
  // const whatsapp = await pacienteRepository.buscarWhatsapp(paciente_cpf);
  // await whatsappService.enviarPropostaRetorno(whatsapp, lembrete);

  return lembrete;
}

async function listarLembretes(query) {
  return retornoRepository.listarLembretes({
    medico_id: query.medico_id || null,
    status:    query.status    || 'PENDENTE',
    page:      query.page      || 1,
    limit:     query.limit     || 20,
  });
}

async function descartar(id) {
  if (!id) throw new Error('ID do lembrete é obrigatório');
  return retornoRepository.descartar(id);
}

async function processarResposta(lembrete_id, resposta) {
  if (!lembrete_id || !resposta) {
    throw new Error('lembrete_id e resposta são obrigatórios');
  }
  const resultado = await retornoRepository.processarResposta(lembrete_id, resposta);

  // TODO (Vito): notificar recepcionista da resposta via WebSocket/notificação interna
  // TODO (Vito): se aceito, enviar WhatsApp de confirmação do pré-agendamento

  return resultado;
}

module.exports = { sugerirRetorno, listarLembretes, descartar, processarResposta };
