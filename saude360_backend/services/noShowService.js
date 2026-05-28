const supabase            = require('../config/db');
const agendamentoService  = require('../services/agendamentoService');

async function verificarNoShows() {
  try {
    const agora    = new Date();
    const hoje     = agora.toISOString().split('T')[0];

    const { data: pendentes, error } = await supabase
      .from('agendamentos')
      .select('id, data_consulta, horario, nome')
      .eq('data_consulta', hoje)
      .eq('status', 'AGUARDANDO');

    if (error) throw new Error(error.message);
    if (!pendentes || pendentes.length === 0) return;

    for (const ag of pendentes) {
      if (!ag.horario) continue;

      const [h, m] = ag.horario.split(':').map(Number);
      const horaConsulta = new Date(ag.data_consulta);
      horaConsulta.setHours(h, m, 0, 0);

      const limiteNoShow = new Date(horaConsulta.getTime() + 15 * 60 * 1000);

      if (agora > limiteNoShow) {
        await agendamentoService.registrarNoShow(ag.id);

        await incrementarNoShowPaciente(ag.id);

        console.log(`[CRON] No-Show registrado: agendamento #${ag.id} — ${ag.nome}`);

        // TODO (Vito): enviar notificação interna para recepcionista via WebSocket
      }
    }
  } catch (err) {
    console.error('[CRON] Erro ao verificar no-shows:', err.message);
  }
}

async function incrementarNoShowPaciente(agendamento_id) {
  const { data: ag } = await supabase
    .from('agendamentos')
    .select('cpf')
    .eq('id', agendamento_id)
    .single();

  if (!ag?.cpf) return;

  const { count } = await supabase
    .from('agendamentos')
    .select('id', { count: 'exact' })
    .eq('cpf', ag.cpf)
    .eq('status', 'NO_SHOW');

  const limiteNoShow = parseInt(process.env.LIMITE_NO_SHOW || '3', 10);

  if (count >= limiteNoShow) {
    console.log(`[CRON] Paciente CPF ${ag.cpf} atingiu ${count} no-shows — bloqueio deve ser aplicado pelo admin`);
    // TODO (Thomas): aplicar bloqueio automático via US-60
    // TODO (Vito): enviar WhatsApp de aviso ao paciente
  }
}

module.exports = { verificarNoShows };
