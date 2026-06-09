/**
 * adminController.js — Saúde 360
 * KPIs reais, auditoria LGPD, métricas operacionais.
 * Todos os dados são buscados direto do banco — sem mock.
 */
const supabase = require('../config/db');

// SEGURANÇA: Nunca permitir dumps ilimitados do banco via query params
const MAX_LIMIT = 100;
const MAX_AUDIT_LIMIT = 200;

async function kpisGerais(req, res) {
  try {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];

    // Consultas de hoje
    const { count: consultasHoje } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('data_consulta', hoje)
      .neq('status', 'CANCELADO');

    // Consultas do mês
    const { count: consultasMes } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .gte('data_consulta', inicioMes)
      .neq('status', 'CANCELADO');

    // Total de pacientes
    const { count: totalPacientes } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('papel', 'paciente')
      .eq('ativo', true);

    // Faturamento do mês
    const { data: faturamento } = await supabase
      .from('pagamentos')
      .select('valor')
      .eq('status', 'PAGO')
      .gte('criado_em', inicioMes + 'T00:00:00');

    const faturamentoMes = (faturamento || []).reduce((acc, p) => acc + Number(p.valor), 0);

    // Taxa de no-show
    const { count: noShows } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'NO_SHOW')
      .gte('data_consulta', inicioMes);

    const { count: totalMes } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .gte('data_consulta', inicioMes)
      .in('status', ['CONFIRMADO', 'CONCLUIDO', 'NO_SHOW']);

    const taxaNoShow = totalMes > 0 ? ((noShows / totalMes) * 100).toFixed(1) : '0.0';

    // Cancelamentos do mês
    const { count: cancelamentos } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'CANCELADO')
      .gte('data_consulta', inicioMes);

    // Médicos ativos
    const { count: medicoAtivos } = await supabase
      .from('medicos')
      .select('id', { count: 'exact', head: true })
      .eq('ativo', true);

    // Em atendimento agora
    const { count: emAtendimento } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('data_consulta', hoje)
      .eq('status', 'EM_ATENDIMENTO');

    // Aguardando agora
    const { count: aguardando } = await supabase
      .from('agendamentos')
      .select('id', { count: 'exact', head: true })
      .eq('data_consulta', hoje)
      .in('status', ['CONFIRMADO', 'CHECKIN_REALIZADO', 'AGUARDANDO']);

    res.json({
      consultasHoje:    consultasHoje    || 0,
      consultasMes:     consultasMes     || 0,
      totalPacientes:   totalPacientes   || 0,
      faturamentoMes:   Number(faturamentoMes.toFixed(2)),
      taxaNoShow:       parseFloat(taxaNoShow),
      cancelamentos:    cancelamentos    || 0,
      medicoAtivos:     medicoAtivos     || 0,
      emAtendimento:    emAtendimento    || 0,
      aguardando:       aguardando       || 0,
      geradoEm:         new Date().toISOString(),
    });
  } catch (err) {
    console.error('[admin kpis]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar KPIs' });
  }
}

async function consultasDoDia(req, res) {
  try {
    const data = req.query.data || new Date().toISOString().split('T')[0];
    const { medico_id } = req.query;

    let query = supabase
      .from('agendamentos')
      .select(`
        id, nome, cpf, horario, status, tipo_consulta, qr_token,
        data_consulta, protocolo,
        medicos(id, nome, especialidade)
      `)
      .eq('data_consulta', data)
      .order('horario', { ascending: true });

    if (medico_id) query = query.eq('medico_id', medico_id);

    const { data: consultas, error } = await query;
    if (error) throw new Error(error.message);

    res.json(consultas || []);
  } catch (err) {
    console.error('[admin consultas-dia]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar consultas do dia' });
  }
}

async function relatorioFaturamento(req, res) {
  try {
    const { data_inicio, data_fim, medico_id } = req.query;

    const inicio = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    let query = supabase
      .from('pagamentos')
      .select(`
        id, nome, cpf, valor, status, criado_em,
        agendamentos!inner(id, data_consulta, tipo_consulta, medico_id,
          medicos(nome, especialidade))
      `)
      .eq('status', 'PAGO')
      .gte('criado_em', inicio + 'T00:00:00')
      .lte('criado_em', fim + 'T23:59:59')
      .order('criado_em', { ascending: false });

    if (medico_id) {
      query = query.eq('agendamentos.medico_id', medico_id);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const total = (data || []).reduce((acc, p) => acc + Number(p.valor), 0);

    res.json({
      pagamentos: data || [],
      total:      Number(total.toFixed(2)),
      periodo:    { inicio, fim },
      quantidade: data?.length || 0,
    });
  } catch (err) {
    console.error('[admin faturamento]', err.message);
    res.status(500).json({ erro: 'Erro ao gerar relatório de faturamento' });
  }
}

async function topMedicos(req, res) {
  try {
    const { data_inicio, data_fim } = req.query;
    const inicio = data_inicio || new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0];
    const fim = data_fim || new Date().toISOString().split('T')[0];

    const { data: agendamentos } = await supabase
      .from('agendamentos')
      .select('medico_id, status, medicos(id, nome, especialidade, nps_medio)')
      .gte('data_consulta', inicio)
      .lte('data_consulta', fim)
      .neq('status', 'PENDENTE_PAGAMENTO');

    // Agrupa por médico
    const porMedico = {};
    for (const ag of agendamentos || []) {
      if (!ag.medico_id) continue;
      if (!porMedico[ag.medico_id]) {
        porMedico[ag.medico_id] = {
          medico:      ag.medicos,
          total:       0,
          concluidos:  0,
          cancelados:  0,
          no_show:     0,
        };
      }
      porMedico[ag.medico_id].total++;
      if (ag.status === 'CONCLUIDO')   porMedico[ag.medico_id].concluidos++;
      if (ag.status === 'CANCELADO')   porMedico[ag.medico_id].cancelados++;
      if (ag.status === 'NO_SHOW')     porMedico[ag.medico_id].no_show++;
    }

    const ranking = Object.values(porMedico)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    res.json(ranking);
  } catch (err) {
    console.error('[admin top-medicos]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar ranking de médicos' });
  }
}

async function ocupacaoPorDia(req, res) {
  try {
    const { data_inicio, data_fim, medico_id } = req.query;
    const inicio = data_inicio || (() => {
      const d = new Date(); d.setDate(d.getDate() - 30); return d.toISOString().split('T')[0];
    })();
    const fim = data_fim || new Date().toISOString().split('T')[0];

    let slotQuery = supabase
      .from('agenda_slots')
      .select('data, status')
      .gte('data', inicio)
      .lte('data', fim);

    if (medico_id) slotQuery = slotQuery.eq('medico_id', medico_id);
    const { data: slots } = await slotQuery;

    // Agrupa por data
    const porData = {};
    for (const s of slots || []) {
      if (!porData[s.data]) porData[s.data] = { total: 0, ocupados: 0 };
      porData[s.data].total++;
      if (s.status === 'OCUPADO') porData[s.data].ocupados++;
    }

    const resultado = Object.entries(porData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, v]) => ({
        data,
        total:    v.total,
        ocupados: v.ocupados,
        livres:   v.total - v.ocupados,
        taxa:     v.total > 0 ? Number(((v.ocupados / v.total) * 100).toFixed(1)) : 0,
      }));

    res.json(resultado);
  } catch (err) {
    console.error('[admin ocupacao]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar ocupação' });
  }
}

async function listarAuditoria(req, res) {
  try {
    const { acao, usuario_id, entidade, data_inicio, data_fim, page = 1, limit = 50 } = req.query;
    // SEGURANÇA: Cap no limit para evitar dumps do banco
    const limiteSanitizado = Math.min(Math.max(1, Number(limit)), MAX_AUDIT_LIMIT);
    const offset = (Math.max(1, Number(page)) - 1) * limiteSanitizado;

    let query = supabase
      .from('audit_log')
      .select('*', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range(offset, offset + limiteSanitizado - 1);

    if (acao)        query = query.eq('acao', acao);
    if (usuario_id)  query = query.eq('usuario_id', usuario_id);
    if (entidade)    query = query.eq('entidade', entidade);
    if (data_inicio) query = query.gte('criado_em', data_inicio + 'T00:00:00');
    if (data_fim)    query = query.lte('criado_em', data_fim + 'T23:59:59');

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    res.json({ dados: data || [], total: count, pagina: Math.max(1, Number(page)), limite: limiteSanitizado });
  } catch (err) {
    console.error('[admin auditoria]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar auditoria' });
  }
}

async function exportarDadosPaciente(req, res) {
  const { usuario_id } = req.params;
  try {
    const { data: usuario, error: userErr } = await supabase
      .from('usuarios')
      .select('id, nome, email, cpf, whatsapp, data_nascimento, sexo, criado_em')
      .eq('id', usuario_id)
      .single();

    if (userErr || !usuario) {
      return res.status(404).json({ erro: 'Usuário não encontrado' });
    }

    const cpf = usuario.cpf;

    const [agendamentos, pagamentos, prontuarios, notificacoes] = await Promise.all([
      supabase
        .from('agendamentos')
        .select('id, data_consulta, horario, status, tipo_consulta, protocolo, criado_em')
        .eq('cpf', cpf)
        .limit(200),
      supabase
        .from('pagamentos')
        .select('id, valor, status, criado_em')
        .eq('cpf', cpf)
        .limit(200),
      supabase
        .from('prontuarios')
        .select('id, queixa, diagnostico, cid, criado_em')
        .eq('paciente_cpf', cpf)
        .limit(200),
      supabase
        .from('notificacoes')
        .select('id, titulo, lida, criado_em')
        .eq('usuario_id', usuario_id)
        .limit(200),
    ]);

    await supabase.from('lgpd_requisicoes').insert([{
      usuario_id,
      tipo: 'EXPORTAR_DADOS',
      status: 'CONCLUIDO',
      concluido_em: new Date().toISOString(),
    }]);

    res.json({
      gerado_em:    new Date().toISOString(),
      titular:      usuario,
      agendamentos: agendamentos.data  || [],
      pagamentos:   pagamentos.data    || [],
      prontuarios:  prontuarios.data   || [],
      notificacoes: notificacoes.data  || [],
      aviso: 'Exportação de dados conforme Art. 18 da LGPD (Lei 13.709/2018)',
    });
  } catch (err) {
    console.error('[admin exportar-dados]', err.message);
    res.status(500).json({ erro: 'Erro ao exportar dados' });
  }
}

async function listarUsuarios(req, res) {
  try {
    const { papel, ativo, page = 1, limit = 50 } = req.query;
    // SEGURANÇA: Cap no limit para evitar dumps do banco
    const limiteSanitizado = Math.min(Math.max(1, Number(limit)), MAX_LIMIT);
    const offset = (Math.max(1, Number(page)) - 1) * limiteSanitizado;

    let query = supabase
      .from('usuarios')
      .select('id, nome, email, cpf, crm, papel, ativo, criado_em, atualizado_em', { count: 'exact' })
      .order('criado_em', { ascending: false })
      .range(offset, offset + limiteSanitizado - 1);

    if (papel) query = query.eq('papel', papel);
    if (ativo !== undefined) query = query.eq('ativo', ativo === 'true');

    const { data, error, count } = await query;
    if (error) throw new Error(error.message);

    res.json({ dados: data || [], total: count, pagina: Math.max(1, Number(page)), limite: limiteSanitizado });
  } catch (err) {
    console.error('[admin usuarios]', err.message);
    res.status(500).json({ erro: 'Erro ao listar usuários' });
  }
}

async function ativarDesativarUsuario(req, res) {
  const { id } = req.params;
  const { ativo } = req.body;

  if (typeof ativo !== 'boolean') {
    return res.status(400).json({ erro: 'Campo "ativo" deve ser boolean' });
  }

  try {
    const { data, error } = await supabase
      .from('usuarios')
      .update({ ativo, atualizado_em: new Date().toISOString() })
      .eq('id', id)
      .select('id, nome, email, papel, ativo')
      .single();

    if (error) throw new Error(error.message);
    res.json({ mensagem: `Usuário ${ativo ? 'ativado' : 'desativado'}`, usuario: data });
  } catch (err) {
    console.error('[admin toggle-usuario]', err.message);
    res.status(500).json({ erro: 'Erro ao atualizar usuário' });
  }
}

module.exports = {
  kpisGerais,
  consultasDoDia,
  relatorioFaturamento,
  topMedicos,
  ocupacaoPorDia,
  listarAuditoria,
  exportarDadosPaciente,
  listarUsuarios,
  ativarDesativarUsuario,
};
