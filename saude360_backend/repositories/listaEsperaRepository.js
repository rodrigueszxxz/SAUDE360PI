const supabase = require('../config/db');

// Real table schema (from OpenAPI introspection):
// id, medico_id, data, horario, nome, whatsapp, posicao, status, criado_em
// Note: No paciente_id column exists — paciente is stored by nome/whatsapp

async function adicionar({ paciente_nome, paciente_whatsapp, medico_id, data, horario }) {
  // Get current queue position
  const { count } = await supabase
    .from('lista_espera')
    .select('*', { count: 'exact', head: true })
    .eq('medico_id', medico_id)
    .eq('data', data)
    .eq('status', 'AGUARDANDO');

  const posicao = (count || 0) + 1;

  const { data: row, error } = await supabase
    .from('lista_espera')
    .insert([{
      medico_id,
      data,
      horario: horario || null,
      nome: paciente_nome,
      whatsapp: paciente_whatsapp || null,
      posicao,
      status: 'AGUARDANDO',
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row;
}

async function buscarProximo(medico_id, data, horario) {
  let query = supabase
    .from('lista_espera')
    .select('*')
    .eq('medico_id', medico_id)
    .eq('data', data)
    .eq('status', 'AGUARDANDO')
    .order('posicao', { ascending: true })
    .limit(1);

  const { data: row, error } = await query.single();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return row || null;
}

async function atualizarStatus(id, status) {
  const { data: row, error } = await supabase
    .from('lista_espera')
    .update({ status })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return row;
}

// Since there's no paciente_id, list by medico and status for admin use
async function listarFilaMedico(medico_id, data) {
  let query = supabase
    .from('lista_espera')
    .select('*')
    .eq('medico_id', medico_id)
    .eq('status', 'AGUARDANDO')
    .order('posicao', { ascending: true });

  if (data) query = query.eq('data', data);

  const { data: rows, error } = await query;
  if (error) throw new Error(error.message);
  return rows || [];
}

module.exports = { adicionar, buscarProximo, atualizarStatus, listarFilaMedico };
