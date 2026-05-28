const supabase = require('../config/db');

async function criar(dados) {
  const { nome, cpf, whatsapp, medico_id, slot_id, data_consulta, horario, tipo_consulta, meet_link, protocolo, status } = dados;

  const { data, error } = await supabase
    .from('agendamentos')
    .insert([{ nome, cpf, whatsapp, medico_id, slot_id, data_consulta, horario, tipo_consulta, meet_link, protocolo, status }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function buscarPorId(id) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, medicos(id, nome, especialidade, crm)')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Listar atendimentos com filtros de data e médico
async function listarHoje(filtros = {}) {
  let query = supabase
    .from('agendamentos')
    .select('*, medicos(id, nome, especialidade)')
    .order('data_consulta', { ascending: true })
    .order('horario', { ascending: true });

  if (filtros.data_inicio && filtros.data_fim) {
    query = query.gte('data_consulta', filtros.data_inicio).lte('data_consulta', filtros.data_fim);
  } else {
    const hoje = new Date().toISOString().split('T')[0];
    query = query.eq('data_consulta', hoje);
  }

  if (filtros.medico_id) query = query.eq('medico_id', filtros.medico_id);
  if (filtros.status)    query = query.eq('status', filtros.status);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data || [];
}

async function listarPorCPF(cpf) {
  const { data, error } = await supabase
    .from('agendamentos')
    .select('*, medicos(id, nome, especialidade, crm)')
    .eq('cpf', cpf)
    .order('data_consulta', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = { criar, buscarPorId, listarHoje, listarPorCPF };
