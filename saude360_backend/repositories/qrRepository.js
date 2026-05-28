/**
 * qrRepository.js — Saúde 360
 *
 * Segurança do QR Code (item 3):
 *  ✓ Token UUID (não previsível)
 *  ✓ Expira após uso (token apagado do banco)
 *  ✓ Não pode ser reutilizado (status CHECKIN_REALIZADO bloqueia nova tentativa)
 *  ✓ Valida dia da consulta
 *  ✓ Valida ownership (agendamento deve estar CONFIRMADO)
 */
const supabase = require('../config/db');
const crypto   = require('crypto');

/**
 * Gera ou regenera o QR token de check-in para um agendamento CONFIRMADO.
 * Apenas admin/recepção pode chamar este endpoint.
 */
async function gerarQRToken(agendamento_id) {
  // Valida que o agendamento existe e está CONFIRMADO
  const { data: ag, error } = await supabase
    .from('agendamentos')
    .select('id, status, data_consulta')
    .eq('id', agendamento_id)
    .single();

  if (error || !ag) throw new Error('Agendamento não encontrado');
  if (!['CONFIRMADO', 'AGUARDANDO'].includes(ag.status)) {
    throw new Error('Agendamento não está com status válido para gerar QR (precisa estar CONFIRMADO)');
  }

  const qr_token = crypto.randomUUID();

  const { data, error: updErr } = await supabase
    .from('agendamentos')
    .update({ qr_token })
    .eq('id', agendamento_id)
    .select('id, qr_token, nome, data_consulta, horario, medicos(nome)')
    .single();

  if (updErr) throw new Error(updErr.message);
  return data;
}

/**
 * Busca o QR token de um agendamento específico pelo ID.
 * O paciente usa este endpoint para exibir o QR no app.
 * O token é retornado apenas se o agendamento está CONFIRMADO.
 */
async function buscarQRPorAgendamento(agendamento_id, cpf) {
  const { data: ag, error } = await supabase
    .from('agendamentos')
    .select('id, qr_token, status, cpf, data_consulta, horario, tipo_consulta, medicos(nome, especialidade)')
    .eq('id', agendamento_id)
    .single();

  if (error || !ag) throw new Error('Agendamento não encontrado');

  // Verifica propriedade (paciente só acessa o próprio)
  if (cpf && ag.cpf !== cpf) {
    throw new Error('Acesso negado a este agendamento');
  }

  if (!['CONFIRMADO', 'AGUARDANDO'].includes(ag.status)) {
    throw new Error('QR Code disponível apenas para consultas confirmadas e pagas');
  }

  if (ag.tipo_consulta === 'TELECONSULTA') {
    throw new Error('Consultas de teleconsulta não requerem check-in por QR Code');
  }

  return ag;
}

/**
 * Valida o QR token e registra o check-in.
 * Após uso, o token é INVALIDADO (apagado do banco) para evitar reutilização.
 */
async function validarQR(qr_token) {
  const hoje = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('agendamentos')
    .select('id, nome, cpf, data_consulta, horario, status, tipo_consulta, medicos(nome)')
    .eq('qr_token', qr_token)
    .single();

  if (error || !data) throw new Error('QR Code inválido ou não encontrado');

  // Verifica dia da consulta
  if (data.data_consulta !== hoje) {
    throw new Error(`QR Code válido apenas no dia da consulta (${data.data_consulta})`);
  }

  // Verifica status — impede múltiplos usos
  if (data.status === 'AGUARDANDO') {
    throw new Error('Check-in já foi realizado para esta consulta');
  }

  if (!['CONFIRMADO'].includes(data.status)) {
    throw new Error('Agendamento não está com status válido para check-in');
  }

  // Realiza check-in e INVALIDA o token (null) para impedir reutilização
  await supabase
    .from('agendamentos')
    .update({
      status: 'AGUARDANDO',
      qr_token: null,           // ← token destruído após uso
      atualizado_em: new Date().toISOString(),
    })
    .eq('id', data.id);

  await supabase.from('status_log').insert([{
    agendamento_id: data.id,
    status_anterior: data.status,
    status_novo: 'AGUARDANDO',
    alterado_por: 'CHECK-IN QR',
  }]).then(() => {}).catch(() => {});

  return { ...data, status: 'AGUARDANDO', check_in_registrado: true };
}

module.exports = { gerarQRToken, validarQR, buscarQRPorAgendamento };
