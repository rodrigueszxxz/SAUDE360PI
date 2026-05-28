const supabase = require('../config/db');

// Listar slots por médico e data (US-27)
async function listarSlots({ medico_id, data, disponivel }) {
  let query = supabase.from('agenda_slots').select(`
    *,
    medicos ( id, nome, especialidade )
  `);

  if (medico_id) {
    const ids = medico_id.split(',').map(Number).filter(Boolean);
    if (ids.length === 1) query = query.eq('medico_id', ids[0]);
    else query = query.in('medico_id', ids);
  }

  if (data) query = query.eq('data', data);

  if (disponivel === 'true') query = query.eq('status', 'LIVRE');

  const { data: slots, error } = await query.order('hora_inicio', { ascending: true });
  if (error) throw new Error(error.message);
  return slots;
}

async function bloquear({ medico_id, data, hora_inicio, hora_fim, motivo, bloqueado_por }) {
  const { data: existente } = await supabase
    .from('agenda_slots')
    .select('*')
    .eq('medico_id', medico_id)
    .eq('data', data)
    .eq('hora_inicio', hora_inicio)
    .single();

  if (existente) {
    if (existente.status === 'OCUPADO') {
      throw new Error('Horário já possui agendamento confirmado — não é possível bloquear');
    }
    const { data: atualizado, error } = await supabase
      .from('agenda_slots')
      .update({ status: 'BLOQUEADO', motivo_bloqueio: motivo, bloqueado_por })
      .eq('id', existente.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return atualizado;
  }

  const { data: slot, error } = await supabase
    .from('agenda_slots')
    .insert([{
      medico_id,
      data,
      hora_inicio,
      hora_fim: hora_fim || hora_inicio,
      status: 'BLOQUEADO',
      motivo_bloqueio: motivo,
      bloqueado_por
    }])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return slot;
}

async function desbloquear(id) {
  const { data: slot, error } = await supabase
    .from('agenda_slots')
    .update({ status: 'LIVRE', motivo_bloqueio: null, bloqueado_por: null })
    .eq('id', id)
    .eq('status', 'BLOQUEADO')
    .select()
    .single();

  if (error) throw new Error(error.message);
  if (!slot) throw new Error('Slot não encontrado ou não está bloqueado');
  return slot;
}

async function moverSlot(agendamento_id, novo_slot_id) {
  const { data: novoSlot } = await supabase
    .from('agenda_slots')
    .select('*')
    .eq('id', novo_slot_id)
    .single();

  if (!novoSlot) throw new Error('Slot de destino não encontrado');
  if (novoSlot.status !== 'LIVRE') throw new Error('Slot de destino não está disponível');

  const { data: agendamento } = await supabase
    .from('agendamentos')
    .select('slot_id')
    .eq('id', agendamento_id)
    .single();

  if (agendamento?.slot_id) {
    await supabase
      .from('agenda_slots')
      .update({ status: 'LIVRE' })
      .eq('id', agendamento.slot_id);
  }

  await supabase
    .from('agenda_slots')
    .update({ status: 'OCUPADO' })
    .eq('id', novo_slot_id);

  const { data: atualizado, error } = await supabase
    .from('agendamentos')
    .update({
      slot_id: novo_slot_id,
      data_consulta: novoSlot.data,
      horario: novoSlot.hora_inicio,
      atualizado_em: new Date().toISOString()
    })
    .eq('id', agendamento_id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return atualizado;
}

module.exports = { listarSlots, bloquear, desbloquear, moverSlot };
