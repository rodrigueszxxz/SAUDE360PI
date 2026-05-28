/**
 * notificacaoService.js — Saúde 360
 * Notificações automáticas: in-app + WhatsApp (Twilio).
 *
 * Canais:
 *  - INTERNO: notificacoes (in-app bell icon)
 *  - WHATSAPP: via whatsappService.js (Twilio)
 *
 * Jobs automáticos (via setInterval no app.js):
 *  - Lembretes 24h e 5h antes da consulta
 *
 * Disparados por evento:
 *  - Confirmação de pagamento → agendamentoService / pagamentoService
 *  - Cancelamento             → agendamentoService
 *  - Vaga lista de espera     → listaEsperaService
 */
const supabase = require('../config/db');
const whatsapp = require('./whatsappService');

async function criarNotificacao(usuario_id, titulo, mensagem, tipo = 'info', link = null) {
  try {
    await supabase.from('notificacoes').insert([{
      usuario_id, titulo, mensagem, tipo, link,
    }]);
  } catch (err) {
    console.error('[notificacao]', err.message);
  }
}

async function registrarLog(tipo, canal, destinatario, agendamento_id, status = 'ENVIADO') {
  try {
    await supabase.from('notificacoes_log').insert([{
      tipo, canal, destinatario, status, agendamento_id,
    }]);
  } catch { /* silencioso */ }
}

/**
 * Roda a cada 1 minuto (via setInterval em app.js).
 * Busca todos os agendamentos CONFIRMADOS e dispara lembretes
 * 24h e 5h antes, usando a tabela notificacoes_log como deduplicação.
 */
async function verificarLembretes() {
  try {
    const agora = new Date();

    // Janelas de tempo (em ms)
    const JANELA_24H_MIN = 23 * 60 * 60 * 1000; // 23h
    const JANELA_24H_MAX = 25 * 60 * 60 * 1000; // 25h
    const JANELA_5H_MIN  =  4 * 60 * 60 * 1000; //  4h
    const JANELA_5H_MAX  =  6 * 60 * 60 * 1000; //  6h

    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('id, nome, cpf, data_consulta, horario, tipo_consulta, medico_id, medicos(nome, especialidade)')
      .in('status', ['CONFIRMADO', 'AGUARDANDO']);

    if (!agendamentos || agendamentos.length === 0) return;

    for (const ag of agendamentos) {
      if (!ag.data_consulta || !ag.horario) continue;

      const dataHora = new Date(`${ag.data_consulta}T${ag.horario}`);
      const diff = dataHora - agora;

      if (diff < 0) continue; // consulta já passou

      // Busca usuario_id pelo CPF
      const { data: usuario } = await supabase
        .from('usuarios')
        .select('id')
        .eq('cpf', ag.cpf)
        .single();
      if (!usuario) continue;

      const dataStr = new Date(ag.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR');
      const tipoLabel = ag.tipo_consulta === 'TELECONSULTA' ? 'teleconsulta (vídeo)' : 'consulta presencial';

            if (diff >= JANELA_24H_MIN && diff <= JANELA_24H_MAX) {
        const { data: jaEnviado } = await supabase
          .from('notificacoes_log')
          .select('id')
          .eq('agendamento_id', ag.id)
          .eq('tipo', 'LEMBRETE_24H')
          .maybeSingle();

        if (!jaEnviado) {
          await criarNotificacao(
            usuario.id,
            '⏰ Sua consulta é amanhã!',
            `Você tem uma ${tipoLabel} amanhã, ${dataStr} às ${ag.horario}${ag.medicos ? ` com ${ag.medicos.nome}` : ''}.`,
            'info',
            '/paciente/portal'
          );

          // Busca WhatsApp do paciente
          const { data: u } = await supabase.from('usuarios').select('whatsapp').eq('cpf', ag.cpf).single();
          if (u?.whatsapp) {
            whatsapp.notificarLembrete24h({
              whatsapp: u.whatsapp,
              nome:     ag.nome,
              medico:   ag.medicos?.nome || 'médico',
              data:     ag.data_consulta,
              horario:  ag.horario,
              tipo:     ag.tipo_consulta,
              meet_link: null,
            }).catch(e => console.error('[notif-whatsapp] lembrete24h:', e.message));
          }

          await registrarLog('LEMBRETE_24H', 'WHATSAPP', ag.cpf, ag.id);
        }
      }

            if (diff >= JANELA_5H_MIN && diff <= JANELA_5H_MAX) {
        const { data: jaEnviado } = await supabase
          .from('notificacoes_log')
          .select('id')
          .eq('agendamento_id', ag.id)
          .eq('tipo', 'LEMBRETE_5H')
          .maybeSingle();

        if (!jaEnviado) {
          const mensagem5h = ag.tipo_consulta === 'TELECONSULTA'
            ? `Sua teleconsulta começa em 5 horas (${ag.horario}). Certifique-se de ter câmera e microfone funcionando.`
            : `Sua consulta presencial começa em 5 horas (${ag.horario}). Chegue com 15 min de antecedência.`;

          await criarNotificacao(
            usuario.id,
            '🔔 Sua consulta começa em 5 horas!',
            mensagem5h,
            'warning',
            '/paciente/portal'
          );
          await registrarLog('LEMBRETE_5H', 'INTERNO', ag.cpf, ag.id);
        }
      }
    }
  } catch (err) {
    console.error('[notificacaoService] verificarLembretes:', err.message);
  }
}

async function notificarCancelamento(agendamento) {
  if (!agendamento?.cpf) return;
  try {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('cpf', agendamento.cpf)
      .single();

    if (!usuario) return;

    const dataStr = agendamento.data_consulta
      ? new Date(agendamento.data_consulta + 'T00:00:00').toLocaleDateString('pt-BR')
      : '';

    await criarNotificacao(
      usuario.id,
      '❌ Consulta cancelada',
      `Sua consulta${dataStr ? ` de ${dataStr}` : ''} foi cancelada. Acesse o portal para reagendar.`,
      'error',
      '/paciente/portal'
    );

    // WhatsApp
    const { data: uWa } = await supabase.from('usuarios').select('whatsapp').eq('cpf', agendamento.cpf).single();
    if (uWa?.whatsapp) {
      whatsapp.notificarCancelamento({
        whatsapp: uWa.whatsapp,
        nome:     agendamento.nome || 'Paciente',
        data:     agendamento.data_consulta,
        horario:  agendamento.horario,
      }).catch(e => console.error('[notif-whatsapp] cancelamento:', e.message));
    }

    await registrarLog('CANCELAMENTO', 'WHATSAPP', agendamento.cpf, agendamento.id);
  } catch (err) {
    console.error('[notificacaoService] notificarCancelamento:', err.message);
  }
}

async function notificarReceituario(agendamento) {
  if (!agendamento?.cpf) return;
  try {
    const { data: usuario } = await supabase
      .from('usuarios')
      .select('id')
      .eq('cpf', agendamento.cpf)
      .single();

    if (!usuario) return;

    await criarNotificacao(
      usuario.id,
      '📄 Receituário disponível',
      'Seu médico emitiu um receituário/prontuário. Acesse o histórico para visualizar.',
      'info',
      '/paciente/historico'
    );
    await registrarLog('RECEITUARIO', 'INTERNO', agendamento.cpf, agendamento.id);
  } catch (err) {
    console.error('[notificacaoService] notificarReceituario:', err.message);
  }
}

module.exports = { verificarLembretes, notificarCancelamento, notificarReceituario, criarNotificacao };
