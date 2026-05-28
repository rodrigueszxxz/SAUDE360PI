const supabase = require('../config/db');

async function criar(dados) {
  const { nome, cpf, valor, codigo_pix, expira_em, agendamento_id } = dados;

  const payload = {
    nome,
    cpf,
    valor,
    codigo_pix: codigo_pix || null,
    status: 'PENDENTE',
    expira_em: expira_em || null,
    agendamento_id: agendamento_id || null,
  };

  const { data, error } = await supabase
    .from('pagamentos')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}


async function buscarPorId(id) {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function buscarPorStripeSession(session_id) {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('stripe_session_id', session_id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

async function atualizarStatus(id, novoStatus, extras = {}) {
  const { data, error } = await supabase
    .from('pagamentos')
    .update({ status: novoStatus, ...extras })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

async function buscarExpirados() {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('status', 'PENDENTE')
    .lt('expira_em', new Date().toISOString());

  if (error) throw new Error(error.message);
  return data || [];
}

async function buscarPorCPF(cpf) {
  const { data, error } = await supabase
    .from('pagamentos')
    .select('*')
    .eq('cpf', cpf)
    .order('id', { ascending: false });

  if (error) throw new Error(error.message);
  return data || [];
}

module.exports = { criar, buscarPorId, buscarPorStripeSession, atualizarStatus, buscarExpirados, buscarPorCPF };
