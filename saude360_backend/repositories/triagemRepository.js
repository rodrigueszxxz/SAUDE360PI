const supabase = require('../config/db');

async function criar(agendamento_id) {
  const perguntas = [
    { id: 1, pergunta: 'Qual é o principal motivo da sua consulta?' },
    { id: 2, pergunta: 'Há quanto tempo você tem esse sintoma? (dias/semanas/meses)' },
    { id: 3, pergunta: 'Você está sentindo dor? Se sim, de 0 a 10, qual a intensidade?' },
    { id: 4, pergunta: 'Você tem alguma alergia a medicamentos?' },
    { id: 5, pergunta: 'Está tomando algum medicamento atualmente?' },
  ];

  const { data, error } = await supabase
    .from('triagens')
    .insert([{ agendamento_id, perguntas, status: 'PENDENTE' }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function responder(agendamento_id, respostas) {
  const { data, error } = await supabase
    .from('triagens')
    .update({
      perguntas: respostas,
      status: 'RESPONDIDA',
      respondida_em: new Date().toISOString()
    })
    .eq('agendamento_id', agendamento_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error('Triagem não encontrada para este agendamento');
  return data;
}

async function buscarPorAgendamento(agendamento_id) {
  const { data, error } = await supabase
    .from('triagens')
    .select('*')
    .eq('agendamento_id', agendamento_id)
    .single();

  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data;
}

async function salvarResumoIA(agendamento_id, resumo_ia) {
  const { data, error } = await supabase
    .from('triagens')
    .update({ resumo_ia })
    .eq('agendamento_id', agendamento_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { criar, responder, buscarPorAgendamento, salvarResumoIA };
