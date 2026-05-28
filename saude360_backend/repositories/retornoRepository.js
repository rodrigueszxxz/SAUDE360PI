const supabase = require('../config/db');

async function criarLembrete({ prontuario_id, agendamento_id, paciente_nome, paciente_cpf, medico_id, prazo_dias }) {
  const prazo_data = new Date();
  prazo_data.setDate(prazo_data.getDate() + (prazo_dias || 30));

  const { data, error } = await supabase
    .from('lembretes_retorno')
    .insert([{
      prontuario_id,
      agendamento_id,
      paciente_nome,
      paciente_cpf,
      medico_id,
      prazo_data: prazo_data.toISOString().split('T')[0],
      status: 'PENDENTE'
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function listarLembretes({ medico_id, status = 'PENDENTE', page = 1, limit = 20 }) {
  const offset = (page - 1) * limit;

  let query = supabase
    .from('lembretes_retorno')
    .select(`
      id, paciente_nome, paciente_cpf, prazo_data, status, resposta, criado_em,
      medicos ( id, nome, especialidade )
    `)
    .eq('status', status)
    .order('prazo_data', { ascending: true });

  if (medico_id) query = query.eq('medico_id', medico_id);

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(error.message);
  return data || [];
}

async function descartar(id) {
  const { data, error } = await supabase
    .from('lembretes_retorno')
    .update({ status: 'DESCARTADO' })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function processarResposta(lembrete_id, resposta) {
  if (!['ACEITO', 'RECUSADO'].includes(resposta)) {
    throw new Error('Resposta inválida. Use ACEITO ou RECUSADO');
  }

  const novo_status = resposta === 'ACEITO' ? 'AGENDADO' : 'DESCARTADO';

  const { data: lembrete, error } = await supabase
    .from('lembretes_retorno')
    .update({ status: novo_status, resposta })
    .eq('id', lembrete_id)
    .select('*, medicos(nome)')
    .single();

  if (error) throw new Error(error.message);

  // Se aceito, criar pré-agendamento
  let pre_agendamento = null;
  if (resposta === 'ACEITO') {
    const { data: pre } = await supabase
      .from('agendamentos')
      .insert([{
        nome: lembrete.paciente_nome,
        cpf: lembrete.paciente_cpf,
        medico_id: lembrete.medico_id,
        status: 'PENDENTE_PAGAMENTO',
        protocolo: `RET-${Date.now()}-${lembrete_id}`
      }])
      .select()
      .single();
    pre_agendamento = pre;
  }

  return { lembrete, pre_agendamento };
}

module.exports = { criarLembrete, listarLembretes, descartar, processarResposta };
