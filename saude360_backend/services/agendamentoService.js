const agendamentoRepository = require('../repositories/agendamentoRepository');
const supabase              = require('../config/db');
const crypto                = require('crypto');
const listaEsperaService    = require('./listaEsperaService');
const notificacaoService    = require('./notificacaoService');

function gerarProtocolo() {
  return `S360-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

async function criarAgendamento(body) {
  const { nome, cpf, whatsapp, medico_id, slot_id, data_consulta, horario, tipo_consulta, valor } = body;

  if (!nome || !cpf) {
    throw new Error('Nome e CPF são obrigatórios');
  }

  // Normaliza e valida o tipo de consulta
  const tipoFinal = (tipo_consulta || 'PRESENCIAL').toUpperCase();

  if (!['PRESENCIAL', 'TELECONSULTA'].includes(tipoFinal)) {
    throw new Error('tipo_consulta inválido. Use PRESENCIAL ou TELECONSULTA');
  }

  // Verifica se o paciente já possui um agendamento ativo
  const { data: ativos } = await supabase
    .from('agendamentos')
    .select('id')
    .eq('cpf', cpf)
    .in('status', ['PENDENTE_PAGAMENTO', 'CONFIRMADO'])
    .maybeSingle();

  if (ativos) {
    throw new Error('Você já possui um agendamento ativo. Conclua a consulta atual ou cancele-a antes de agendar outra.');
  }

  // Valida tipo_consulta contra a configuração do médico (backend enforcement)
  if (medico_id) {
    const { data: medico, error: medicErr } = await supabase
      .from('medicos')
      .select('tipos_consulta, nome')
      .eq('id', medico_id)
      .single();

    if (medicErr) throw new Error('Médico não encontrado');

    // Normaliza para maiúsculas para comparação consistente
    const tiposDoMedico = (medico?.tipos_consulta ?? ['PRESENCIAL']).map(t => t.toUpperCase());

    if (tiposDoMedico.length > 0 && !tiposDoMedico.includes(tipoFinal)) {
      throw new Error(
        `Este médico não oferece ${tipoFinal.toLowerCase()}. ` +
        `Tipos disponíveis: ${tiposDoMedico.join(', ')}`
      );
    }
  }

  // Verificar e bloquear slot
  if (slot_id) {
    try {
      const { data: slot } = await supabase
        .from('agenda_slots')
        .select('status')
        .eq('id', slot_id)
        .single();

      if (!slot || slot.status !== 'LIVRE') {
        throw new Error('Horário selecionado não está mais disponível');
      }

      const { error: updErr } = await supabase
        .from('agenda_slots')
        .update({ status: 'OCUPADO' })
        .eq('id', slot_id);

      if (updErr) throw new Error('Erro ao reservar horário');
    } catch (err) {
      throw err;
    }
  } else if (data_consulta && horario && medico_id) {
    // Se não usa slot_id, valida manualmente se o horário já está ocupado
    // Normaliza horário para busca (pode vir como HH:MM ou HH:MM:SS)
    const horarioNormalizado = horario.substring(0, 5);
    const { data: existente } = await supabase
      .from('agendamentos')
      .select('id')
      .eq('medico_id', medico_id)
      .eq('data_consulta', data_consulta)
      .filter('horario', 'like', `${horarioNormalizado}%`)
      .not('status', 'in', '("CANCELADO","NO_SHOW")')
      .maybeSingle();

    if (existente) {
      throw new Error('Este horário já foi agendado. Por favor, escolha outro.');
    }
  }

  const protocolo = gerarProtocolo();

  // Link Meet gerado na criação, mas só acessível após pagamento confirmado no frontend
  let meet_link = null;
  if (tipoFinal === 'TELECONSULTA') {
    const meetId = crypto.randomBytes(5).toString('hex');
    meet_link = `https://meet.google.com/new?hs=180&authuser=0&label=saude360-${meetId}`;
  }

  const agendamento = await agendamentoRepository.criar({
    nome, cpf, whatsapp,
    medico_id:     medico_id     || null,
    slot_id:       slot_id       || null,
    data_consulta: data_consulta || null,
    horario:       horario       || null,
    tipo_consulta: tipoFinal,
    meet_link,
    protocolo,
    status: 'PENDENTE_PAGAMENTO',
  });

  if (valor !== undefined && valor !== null) {
    const pagamentoRepository = require('../repositories/pagamentoRepository');
    try {
      await pagamentoRepository.criar({
        nome,
        cpf,
        valor,
        agendamento_id: agendamento.id
      });
    } catch (e) {
      console.error('Erro ao gerar rascunho de pagamento', e);
    }
  }

  // Notificação interna ao paciente
  if (cpf) {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('cpf', cpf)
      .single();

    if (usuario) {
      const dataStr = data_consulta
        ? new Date(data_consulta + 'T00:00:00').toLocaleDateString('pt-BR')
        : '';
      await notificacaoService.criarNotificacao(
        usuario.id,
        '📅 Agendamento criado',
        `Sua consulta foi agendada para ${dataStr} às ${horario || '—'}. Conclua o pagamento para confirmar.`,
        'info',
        `/paciente/pagamento`
      );
    }
  }

  return agendamento;
}

async function atualizarStatus(id, status, alterado_por) {
  const statusValidos = [
    'PENDENTE_PAGAMENTO', 'CONFIRMADO', 'AGUARDANDO',
    'CHECKIN_REALIZADO', 'EM_ATENDIMENTO', 'REALIZADO', 'CONCLUIDO', 'CANCELADO', 'NO_SHOW',
  ];
  if (!statusValidos.includes(status)) {
    throw new Error(`Status inválido. Use: ${statusValidos.join(', ')}`);
  }

  const { data: atual } = await supabase
    .from('agendamentos')
    .select('status')
    .eq('id', id)
    .single();

  if (!atual) throw new Error('Agendamento não encontrado');

  const { data: atualizado, error } = await supabase
    .from('agendamentos')
    .update({ status, atualizado_em: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);

  await supabase.from('status_log').insert([{
    agendamento_id: id,
    status_anterior: atual.status,
    status_novo: status,
    alterado_por: alterado_por || 'SISTEMA',
  }]).then(() => {}).catch(() => {});

  return atualizado;
}

async function cancelar(id, solicitado_por) {
  const { data: ag } = await supabase
    .from('agendamentos')
    .select('id, status, data_consulta, horario, slot_id, cpf, medico_id')
    .eq('id', id)
    .single();

  if (!ag) throw new Error('Agendamento não encontrado');

  if (['CANCELADO', 'CONCLUIDO', 'NO_SHOW'].includes(ag.status)) {
    throw new Error(`Agendamento já está com status: ${ag.status}`);
  }

  let statusFinanceiro = 'REEMBOLSADO';
  if (ag.data_consulta && ag.horario) {
    const dataHora = new Date(`${ag.data_consulta}T${ag.horario}`);
    const diff = dataHora - new Date();

    if (diff < 12 * 60 * 60 * 1000) {
      if (solicitado_por === 'PACIENTE') {
        throw new Error('Cancelamento só permitido com até 12 horas de antecedência. Contate a recepção.');
      }
      statusFinanceiro = 'CREDITO_RETIDO';
    }
  }

  // Estorno financeiro
  const { data: pagamento } = await supabase
    .from('pagamentos')
    .select('id, status')
    .eq('agendamento_id', id)
    .maybeSingle();

  if (pagamento && pagamento.status === 'PAGO') {
    await supabase.from('pagamentos').update({ status: statusFinanceiro }).eq('id', pagamento.id);
  }

  // Libera o slot
  if (ag.slot_id) {
    await supabase
      .from('agenda_slots')
      .update({ status: 'LIVRE' })
      .eq('id', ag.slot_id);

    // Aciona lista de espera
    listaEsperaService.acionarFilaSeNecessario(ag.medico_id, ag.data_consulta, ag.horario)
      .catch(err => console.error('[ListaEspera] Erro ao acionar fila:', err.message));
  }

  // Dispara notificação de cancelamento
  notificacaoService.notificarCancelamento(ag)
    .catch(err => console.error('[notif] cancelamento:', err.message));

  return atualizarStatus(id, 'CANCELADO', solicitado_por || 'PACIENTE');
}

async function registrarNoShow(id) {
  return atualizarStatus(id, 'NO_SHOW', 'CRON_JOB');
}

module.exports = { criarAgendamento, atualizarStatus, cancelar, registrarNoShow };
