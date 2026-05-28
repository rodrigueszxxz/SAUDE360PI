/**
 * slotGeneratorService.js — Saúde 360
 * Gera slots de agenda automaticamente com base na disponibilidade configurada.
 *
 * Respeita:
 *  - Dias da semana configurados
 *  - Horário de início/fim
 *  - Duração da consulta
 *  - Pausas (almoço, etc.)
 *  - Bloqueios (férias, feriados, ausências)
 *  - Feriados nacionais
 *  - Limite diário de consultas
 *  - Slots já existentes (não duplica)
 */
const supabase = require('../config/db');

/**
 * Gera HH:MM de todos os horários dentro de um intervalo,
 * respeitando a duração da consulta e pausas.
 *
 * @param {string} horaInicio     - "08:00"
 * @param {string} horaFim        - "12:00"
 * @param {number} duracaoMin     - duração em minutos
 * @param {Array}  pausas         - [{hora_inicio_pausa: "10:00", hora_fim_pausa: "10:15"}]
 * @returns {string[]} lista de horários no formato "HH:MM"
 */
function gerarHorariosDoDia(horaInicio, horaFim, duracaoMin, pausas = []) {
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };
  const toHHMM = (min) => {
    const h = Math.floor(min / 60).toString().padStart(2, '0');
    const m = (min % 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const inicio   = toMin(horaInicio);
  const fim      = toMin(horaFim);
  const duracao  = duracaoMin || 30;
  const horarios = [];

  // Monta lista de pausas em minutos
  const pausasMin = pausas.map(p => ({
    ini: toMin(p.hora_inicio_pausa),
    fim: toMin(p.hora_fim_pausa),
  }));

  let cursor = inicio;
  while (cursor + duracao <= fim) {
    const slotFim = cursor + duracao;

    // Verifica sobreposição com pausa
    const emPausa = pausasMin.some(p => cursor < p.fim && slotFim > p.ini);

    if (!emPausa) {
      horarios.push(toHHMM(cursor));
    } else {
      // Avança para o fim da pausa
      const pausa = pausasMin.find(p => cursor < p.fim && slotFim > p.ini);
      if (pausa) cursor = pausa.fim;
      continue;
    }
    cursor += duracao;
  }

  return horarios;
}

/**
 * Gera datas entre data_inicio e data_fim (inclusive).
 */
function gerarDatas(data_inicio, data_fim) {
  const datas = [];
  const cur = new Date(data_inicio + 'T00:00:00');
  const end = new Date(data_fim   + 'T00:00:00');

  while (cur <= end) {
    datas.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return datas;
}

/**
 * Verifica se uma data está bloqueada.
 */
function estaBloqueada(data, horaInicio, horaFim, bloqueios, feriados) {
  const dataStr = data;

  // Feriado
  if (feriados.includes(dataStr)) return true;

  // Bloqueio de agenda
  for (const b of bloqueios) {
    if (dataStr < b.data_inicio || dataStr > b.data_fim) continue;

    // Bloqueio de dia inteiro
    if (!b.hora_inicio && !b.hora_fim) return true;

    // Bloqueio parcial (por horário)
    if (b.hora_inicio && b.hora_fim) {
      if (horaInicio < b.hora_fim && horaFim > b.hora_inicio) return true;
    }
  }

  return false;
}

/**
 * Função principal: gera slots para um médico em um intervalo de datas.
 */
async function gerarSlots(medico_id, data_inicio, data_fim) {
  // 1. Busca disponibilidade do médico
  const { data: disponibilidades, error: dispErr } = await supabase
    .from('disponibilidade_medica')
    .select('*')
    .eq('medico_id', medico_id)
    .eq('ativo', true);

  if (dispErr) throw new Error('Erro ao buscar disponibilidade: ' + dispErr.message);
  if (!disponibilidades?.length) {
    throw new Error('Nenhuma disponibilidade configurada para este médico');
  }

  // 2. Busca pausas
  const { data: pausas } = await supabase
    .from('pausas_medico')
    .select('*')
    .eq('medico_id', medico_id)
    .eq('ativo', true);

  // 3. Busca bloqueios no período
  const { data: bloqueios } = await supabase
    .from('bloqueios_agenda')
    .select('*')
    .eq('medico_id', medico_id)
    .lte('data_inicio', data_fim)
    .gte('data_fim', data_inicio);

  // 4. Busca feriados no período
  const { data: feriadosDb } = await supabase
    .from('feriados')
    .select('data')
    .gte('data', data_inicio)
    .lte('data', data_fim);

  const feriados = (feriadosDb || []).map(f => f.data);

  // 5. Slots existentes (para deduplicação)
  const { data: slotsExistentes } = await supabase
    .from('agenda_slots')
    .select('data, hora_inicio')
    .eq('medico_id', medico_id)
    .gte('data', data_inicio)
    .lte('data', data_fim);

  const existentesSet = new Set(
    (slotsExistentes || []).map(s => `${s.data}|${s.hora_inicio.slice(0, 5)}`)
  );

  // 6. Indexa disponibilidade por dia da semana
  const dispPorDia = {};
  for (const d of disponibilidades) {
    if (!dispPorDia[d.dia_semana]) dispPorDia[d.dia_semana] = [];
    dispPorDia[d.dia_semana].push(d);
  }

  // 7. Itera pelas datas do período
  const datas  = gerarDatas(data_inicio, data_fim);
  const novosSlots = [];
  let   criados    = 0;

  for (const data of datas) {
    const diaSemana = new Date(data + 'T12:00:00').getDay(); // 0=Dom, 6=Sab
    const configs   = dispPorDia[diaSemana];
    if (!configs?.length) continue;

    for (const config of configs) {
      const pausasDoDia = (pausas || []).filter(p => p.dia_semana === diaSemana);

      const horarios = gerarHorariosDoDia(
        config.hora_inicio,
        config.hora_fim,
        config.duracao_consulta_min,
        pausasDoDia
      );

      let contadorDia = 0;

      for (const hora of horarios) {
        if (config.max_consultas_dia && contadorDia >= config.max_consultas_dia) break;

        // Verifica bloqueio
        const hFim = (() => {
          const [h, m] = hora.split(':').map(Number);
          const totalMin = h * 60 + m + (config.duracao_consulta_min || 30);
          return `${String(Math.floor(totalMin / 60)).padStart(2, '0')}:${String(totalMin % 60).padStart(2, '0')}`;
        })();

        if (estaBloqueada(data, hora, hFim, bloqueios || [], feriados)) continue;

        const chave = `${data}|${hora}`;
        if (existentesSet.has(chave)) continue;

        novosSlots.push({
          medico_id,
          data,
          hora_inicio: hora,
          hora_fim:    hFim,
          status:      'LIVRE',
        });

        existentesSet.add(chave);
        contadorDia++;
      }
    }
  }

  // 8. Insere em batch (chunks de 200)
  const BATCH = 200;
  for (let i = 0; i < novosSlots.length; i += BATCH) {
    const chunk = novosSlots.slice(i, i + BATCH);
    const { error } = await supabase
      .from('agenda_slots')
      .insert(chunk);
    if (error) {
      console.error('[slotGenerator] Erro ao inserir batch:', error.message);
    } else {
      criados += chunk.length;
    }
  }

  console.log(`[slotGenerator] Médico ${medico_id}: ${criados} slots criados (${data_inicio} → ${data_fim})`);

  return {
    medico_id,
    periodo: { data_inicio, data_fim },
    slots_criados:   criados,
    slots_ignorados: novosSlots.length - criados,
  };
}

module.exports = { gerarSlots };
