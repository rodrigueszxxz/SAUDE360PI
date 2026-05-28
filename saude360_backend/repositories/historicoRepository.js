const supabase = require('../config/db');

async function buscarHistoricoMedico(paciente_cpf, { page = 1, limit = 20, tipo, data_inicio, data_fim, medico_id }) {
  const offset = (page - 1) * limit;

  let consultasQuery = supabase
    .from('agendamentos')
    .select(`
      id, data_consulta, horario, status, tipo_consulta, protocolo,
      medicos ( id, nome, especialidade, crm )
    `)
    .eq('cpf', paciente_cpf)
    .not('status', 'in', '("PENDENTE_PAGAMENTO")')
    .order('data_consulta', { ascending: false });

  if (data_inicio) consultasQuery = consultasQuery.gte('data_consulta', data_inicio);
  if (data_fim)    consultasQuery = consultasQuery.lte('data_consulta', data_fim);
  if (medico_id)   consultasQuery = consultasQuery.eq('medico_id', medico_id);

  const { data: consultas, error: errC } = await consultasQuery
    .range(offset, offset + limit - 1);
  if (errC) throw new Error(errC.message);

  let docsQuery = supabase
    .from('documentos')
    .select(`
      id, tipo, titulo, assinado, assinado_em, criado_em,
      medicos ( id, nome, especialidade )
    `)
    .eq('paciente_cpf', paciente_cpf)
    .order('criado_em', { ascending: false });

  if (tipo) docsQuery = docsQuery.eq('tipo', tipo.toUpperCase());

  const { data: documentos } = await docsQuery.limit(50);

  const { data: prontuarios } = await supabase
    .from('prontuarios')
    .select(`
      id, queixa, diagnostico, conduta, cid, assinado, criado_em,
      medicos ( id, nome, especialidade )
    `)
    .eq('paciente_cpf', paciente_cpf)
    .order('criado_em', { ascending: false })
    .limit(50);

  return {
    consultas: consultas || [],
    documentos: documentos || [],
    prontuarios: prontuarios || [],
    pagina: Number(page),
    limite: Number(limit)
  };
}

async function buscarTimeline(paciente_cpf, { page = 1, limit = 30 }) {
  const offset = (page - 1) * limit;
  const eventos = [];

  const [{ data: consultas }, { data: documentos }, { data: prontuarios }] = await Promise.all([
    supabase
      .from('agendamentos')
      .select('id, data_consulta, status, medicos(nome, especialidade)')
      .eq('cpf', paciente_cpf)
      .not('data_consulta', 'is', null)
      .order('data_consulta', { ascending: false })
      .range(offset, offset + limit - 1),

    supabase
      .from('documentos')
      .select('id, tipo, titulo, assinado, criado_em')
      .eq('paciente_cpf', paciente_cpf)
      .order('criado_em', { ascending: false })
      .limit(30),

    supabase
      .from('prontuarios')
      .select('id, diagnostico, cid, criado_em, medicos(nome)')
      .eq('paciente_cpf', paciente_cpf)
      .order('criado_em', { ascending: false })
      .limit(30),
  ]);

  if (consultas) consultas.forEach(c => eventos.push({ ...c, _tipo: 'CONSULTA', _data: c.data_consulta }));
  if (documentos) documentos.forEach(d => eventos.push({ ...d, _tipo: 'DOCUMENTO', _data: d.criado_em }));
  if (prontuarios) prontuarios.forEach(p => eventos.push({ ...p, _tipo: 'PRONTUARIO', _data: p.criado_em }));

  eventos.sort((a, b) => new Date(b._data) - new Date(a._data));

  return { eventos: eventos.slice(0, limit), pagina: Number(page), limite: Number(limit) };
}

module.exports = { buscarHistoricoMedico, buscarTimeline };
