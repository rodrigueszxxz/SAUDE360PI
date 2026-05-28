const supabase = require('../config/db');

async function listar(filtros) {
  let query = supabase.from('medicos').select('*').eq('ativo', true);

  if (filtros.nome) {
    query = query.ilike('nome', `%${filtros.nome}%`);
  }

  if (filtros.especialidade) {
    query = query.ilike('especialidade', `%${filtros.especialidade}%`);
  }

  if (filtros.convenio) {
    query = query.contains('convenios', [filtros.convenio]);
  }

  if (filtros.ordem === 'nps') {
    query = query
      .gt('total_avaliacoes', 0)
      .order('nps_medio', { ascending: false });
  } else {
    query = query.order('nome', { ascending: true });
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

async function atualizarNPS(medico_id) {
  const { data: avaliacoes } = await supabase
    .from('avaliacoes_nps')
    .select('nota')
    .eq('medico_id', medico_id);

  if (!avaliacoes || avaliacoes.length === 0) return;

  const total = avaliacoes.length;
  const media = avaliacoes.reduce((acc, a) => acc + a.nota, 0) / total;

  await supabase
    .from('medicos')
    .update({ nps_medio: media.toFixed(2), total_avaliacoes: total })
    .eq('id', medico_id);
}

module.exports = { listar, atualizarNPS };
