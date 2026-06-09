/**
 * prontuarioController.js — Saúde 360
 * Adaptado para usar APENAS colunas existentes no banco de dados.
 * Receitas, Atestados, Pedidos de Exame e Evoluções são armazenados
 * na tabela `documentos` (que já existe), com o campo `tipo` distinguindo.
 *
 * Para adicionar colunas extras (anamnese, sinais vitais, etc.),
 * execute a migration 011_prontuario_completo.sql no Supabase SQL Editor.
 */
const supabase = require('../config/db');
const { registrarAuditoria, extrairIP } = require('../middlewares/auditoria');

/* ── Helpers ─────────────────────────────────────────────────────── */

/** Converte data string (YYYY-MM-DD) para número inteiro de dias a partir de hoje */
function dataToDias(dateStr) {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return dateStr;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T00:00:00');
  if (isNaN(target.getTime())) return null;
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}

/** Parse de documento armazenado como JSON no campo `arquivo_url` ou `titulo` */
const parseDoc = d => {
  let obj = {};
  const content = d.arquivo_url || d.titulo;
  try { obj = JSON.parse(content); } catch (e) { obj = { raw: content }; }
  return { ...d, ...obj };
};

/* ── buscarPorAgendamento ─────────────────────────────────────────── */
async function buscarPorAgendamento(req, res) {
  const { agendamento_id } = req.params;
  try {
    const { data, error } = await supabase
      .from('prontuarios')
      .select(`
        id, agendamento_id, paciente_cpf, medico_id,
        queixa, diagnostico, conduta, cid,
        necessita_retorno, prazo_retorno,
        assinado, assinado_em, versao,
        criado_em, atualizado_em,
        medicos(nome, especialidade, crm)
      `)
      .eq('agendamento_id', agendamento_id)
      .order('versao', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw new Error(error.message);

    // Busca documentos clínicos desta consulta na tabela `documentos`
    let documentos = [];
    if (data) {
      const { data: docs } = await supabase
        .from('documentos')
        .select('id, tipo, titulo, arquivo_url, assinado, assinado_em, criado_em')
        .eq('agendamento_id', agendamento_id)
        .order('criado_em', { ascending: false });
      documentos = docs || [];
    }

    const result = data ? {
      ...data,
      receitas:            documentos.filter(d => d.tipo === 'RECEITA').map(parseDoc),
      atestados:           documentos.filter(d => d.tipo === 'ATESTADO').map(parseDoc),
      pedidos_exame:       documentos.filter(d => d.tipo === 'PEDIDO_EXAME').map(parseDoc),
      evolucoes_prontuario: documentos
        .filter(d => d.tipo === 'EVOLUCAO')
        .map(d => ({ id: d.id, texto: d.arquivo_url || d.titulo, criado_em: d.criado_em })),
    } : null;

    if (req.usuario.papel === 'paciente' && result) {
      delete result.observacoes_privadas;
    }

    await registrarAuditoria({
      usuario_id:    req.usuario.id,
      usuario_email: req.usuario.email,
      usuario_papel: req.usuario.papel,
      acao:          'VER_PRONTUARIO',
      entidade:      'prontuarios',
      entidade_id:   data?.id,
      descricao:     `Visualizou prontuário do agendamento ${agendamento_id}`,
      ip:            extrairIP(req),
      user_agent:    req.headers['user-agent'],
    });

    res.json(result || null);
  } catch (err) {
    console.error('[prontuario GET]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── buscarPorCPF ────────────────────────────────────────────────── */
async function buscarPorCPF(req, res) {
  const { cpf } = req.params;
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  if (req.usuario.papel === 'paciente' && req.usuario.cpf !== cpf) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  try {
    const { data, error, count } = await supabase
      .from('prontuarios')
      .select(`
        id, agendamento_id, paciente_cpf, medico_id,
        queixa, diagnostico, cid, assinado, assinado_em,
        criado_em, medicos(nome, especialidade)
      `, { count: 'exact' })
      .eq('paciente_cpf', cpf)
      .order('criado_em', { ascending: false })
      .range(offset, offset + Number(limit) - 1);

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      usuario_id:    req.usuario.id,
      usuario_email: req.usuario.email,
      usuario_papel: req.usuario.papel,
      acao:          'LISTAR_PRONTUARIOS',
      entidade:      'prontuarios',
      entidade_id:   cpf,
      ip:            extrairIP(req),
    });

    res.json({ dados: data || [], total: count, pagina: Number(page), limite: Number(limit) });
  } catch (err) {
    console.error('[prontuario CPF]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── criar ───────────────────────────────────────────────────────── */
async function criar(req, res) {
  const {
    agendamento_id, paciente_cpf,
    queixa, diagnostico, conduta, cid,
    necessita_retorno, prazo_retorno,
  } = req.body;

  if (!agendamento_id || !paciente_cpf) {
    return res.status(400).json({ erro: 'agendamento_id e paciente_cpf são obrigatórios' });
  }

  try {
    const { data: ag, error: agErr } = await supabase
      .from('agendamentos')
      .select('id, medico_id, status, cpf')
      .eq('id', agendamento_id)
      .single();

    if (agErr || !ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    // Médico só cria prontuário dos próprios pacientes
    if (req.usuario.papel === 'medico') {
      let q = supabase.from('medicos').select('id');
      if (req.usuario.crm) q = q.eq('crm', req.usuario.crm);
      else q = q.eq('nome', req.usuario.nome);
      const { data: medico } = await q.single();

      if (!medico || medico.id !== ag.medico_id) {
        return res.status(403).json({ erro: 'Você não é o médico deste agendamento' });
      }
    }

    // Montar payload apenas com colunas que existem na tabela
    const payload = {
      agendamento_id,
      paciente_cpf,
      medico_id: ag.medico_id,
    };
    if (queixa !== undefined)             payload.queixa = queixa || null;
    if (diagnostico !== undefined)        payload.diagnostico = diagnostico || null;
    if (conduta !== undefined)            payload.conduta = conduta || null;
    if (cid !== undefined)                payload.cid = cid ? String(cid).substring(0, 20) : null;
    if (necessita_retorno !== undefined)  payload.necessita_retorno = !!necessita_retorno;
    if (prazo_retorno)                    payload.prazo_retorno = dataToDias(prazo_retorno);

    const { data, error } = await supabase
      .from('prontuarios')
      .insert([payload])
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      usuario_id:    req.usuario.id,
      usuario_email: req.usuario.email,
      usuario_papel: req.usuario.papel,
      acao:          'CRIAR_PRONTUARIO',
      entidade:      'prontuarios',
      entidade_id:   data.id,
      dados_novos:   { agendamento_id, paciente_cpf, diagnostico },
      ip:            extrairIP(req),
    });

    res.status(201).json(data);
  } catch (err) {
    console.error('[prontuario criar]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── atualizar ───────────────────────────────────────────────────── */
async function atualizar(req, res) {
  const { id } = req.params;

  try {
    const { data: atual, error: buscarErr } = await supabase
      .from('prontuarios')
      .select('id, assinado, medico_id')
      .eq('id', id)
      .single();

    if (buscarErr || !atual) return res.status(404).json({ erro: 'Prontuário não encontrado' });
    if (atual.assinado) {
      return res.status(400).json({ erro: 'Prontuário já assinado e não pode ser editado' });
    }

    // Apenas colunas que realmente existem na tabela prontuarios
    const camposPermitidos = [
      'queixa', 'diagnostico', 'conduta', 'cid',
      'necessita_retorno', 'prazo_retorno',
    ];

    const campos = {};
    for (const k of camposPermitidos) {
      if (req.body[k] !== undefined) {
        campos[k] = req.body[k] === '' ? null : req.body[k];
      }
    }

    if (campos.cid) {
      campos.cid = String(campos.cid).substring(0, 20);
    }

    // Converter prazo_retorno de data string para inteiro de dias
    if (campos.prazo_retorno && typeof campos.prazo_retorno === 'string') {
      campos.prazo_retorno = dataToDias(campos.prazo_retorno);
    }

    // Finalizar prontuário
    if (req.body.status === 'FINALIZADO' || req.body.finalizado) {
      campos.assinado    = true;
      campos.assinado_em = new Date().toISOString();
    }

    campos.atualizado_em = new Date().toISOString();

    const { data, error } = await supabase
      .from('prontuarios')
      .update(campos)
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      usuario_id:      req.usuario.id,
      usuario_email:   req.usuario.email,
      usuario_papel:   req.usuario.papel,
      acao:            'EDITAR_PRONTUARIO',
      entidade:        'prontuarios',
      entidade_id:     id,
      dados_anteriores: { assinado: atual.assinado },
      dados_novos:      campos,
      ip:              extrairIP(req),
    });

    res.json(data);
  } catch (err) {
    console.error('[prontuario update]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── criarReceita ────────────────────────────────────────────────── */
async function criarReceita(req, res) {
  const { prontuario_id, medicamentos, observacoes, validade_dias, tipo } = req.body;

  if (!prontuario_id || !medicamentos?.length) {
    return res.status(400).json({ erro: 'prontuario_id e medicamentos são obrigatórios' });
  }

  try {
    const { data: p } = await supabase
      .from('prontuarios')
      .select('agendamento_id, paciente_cpf, medico_id')
      .eq('id', prontuario_id)
      .single();

    if (!p) return res.status(404).json({ erro: 'Prontuário não encontrado' });

    const conteudo = {
      prontuario_id,
      medicamentos,
      observacoes:   observacoes  || null,
      validade_dias: validade_dias || 30,
      tipo:          tipo         || 'SIMPLES',
    };

    const { data, error } = await supabase
      .from('documentos')
      .insert([{
        agendamento_id: p.agendamento_id,
        medico_id:      p.medico_id,
        paciente_cpf:   p.paciente_cpf,
        tipo:           'RECEITA',
        titulo:         'Receita Médica',
        arquivo_url:    JSON.stringify(conteudo),
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      usuario_id:    req.usuario.id,
      usuario_email: req.usuario.email,
      usuario_papel: req.usuario.papel,
      acao:          'EMITIR_RECEITA',
      entidade:      'documentos',
      entidade_id:   data.id,
      dados_novos:   { prontuario_id, medicamentos },
      ip:            extrairIP(req),
    });

    res.status(201).json({ ...conteudo, id: data.id, criado_em: data.criado_em });
  } catch (err) {
    console.error('[receita criar]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── listarReceitas ──────────────────────────────────────────────── */
async function listarReceitas(req, res) {
  const { cpf } = req.params;

  if (req.usuario.papel === 'paciente' && req.usuario.cpf !== cpf) {
    return res.status(403).json({ erro: 'Acesso negado' });
  }

  try {
    const { data, error } = await supabase
      .from('documentos')
      .select('*, medicos(nome, crm, especialidade)')
      .eq('paciente_cpf', cpf)
      .eq('tipo', 'RECEITA')
      .order('criado_em', { ascending: false });

    if (error) throw new Error(error.message);
    const result = (data || []).map(d => {
      let dados = {};
      const content = d.arquivo_url || d.titulo;
      try { dados = JSON.parse(content); } catch { dados = {}; }
      return { ...dados, id: d.id, criado_em: d.criado_em, medicos: d.medicos };
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({erro: err.message});
  }
}

/* ── criarAtestado ───────────────────────────────────────────────── */
async function criarAtestado(req, res) {
  const { prontuario_id, tipo, dias_afastamento, cid, descricao, assinatura_token } = req.body;

  if (!prontuario_id) {
    return res.status(400).json({ erro: 'prontuario_id é obrigatório' });
  }

  try {
    const { data: p } = await supabase
      .from('prontuarios')
      .select('agendamento_id, paciente_cpf, medico_id')
      .eq('id', prontuario_id)
      .single();

    if (!p) return res.status(404).json({ erro: 'Prontuário não encontrado' });

    const conteudo = {
      prontuario_id,
      tipo:             tipo             || 'AFASTAMENTO',
      dias_afastamento: dias_afastamento || null,
      cid:              cid              || null,
      descricao:        descricao        || null,
      assinatura_token: assinatura_token || null,
    };

    const { data, error } = await supabase
      .from('documentos')
      .insert([{
        agendamento_id: p.agendamento_id,
        medico_id:      p.medico_id,
        paciente_cpf:   p.paciente_cpf,
        tipo:           'ATESTADO',
        titulo:         'Atestado Médico',
        arquivo_url:    JSON.stringify(conteudo),
        assinado:       !!assinatura_token,
        assinado_em:    assinatura_token ? new Date().toISOString() : null,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);

    await registrarAuditoria({
      usuario_id:    req.usuario.id,
      usuario_email: req.usuario.email,
      usuario_papel: req.usuario.papel,
      acao:          'EMITIR_ATESTADO',
      entidade:      'documentos',
      entidade_id:   data.id,
      ip:            extrairIP(req),
    });

    res.status(201).json({ ...conteudo, id: data.id, criado_em: data.criado_em, assinado: data.assinado });
  } catch (err) {
    console.error('[atestado criar]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── criarPedidoExame ────────────────────────────────────────────── */
async function criarPedidoExame(req, res) {
  const { prontuario_id, exames, urgencia, observacoes, validade_dias } = req.body;

  if (!prontuario_id || !exames?.length) {
    return res.status(400).json({ erro: 'prontuario_id e exames são obrigatórios' });
  }

  try {
    const { data: p } = await supabase
      .from('prontuarios')
      .select('agendamento_id, paciente_cpf, medico_id')
      .eq('id', prontuario_id)
      .single();

    if (!p) return res.status(404).json({ erro: 'Prontuário não encontrado' });

    const conteudo = {
      prontuario_id,
      exames,
      urgencia:      urgencia      || 'ROTINA',
      observacoes:   observacoes   || null,
      validade_dias: validade_dias || 90,
    };

    const { data, error } = await supabase
      .from('documentos')
      .insert([{
        agendamento_id: p.agendamento_id,
        medico_id:      p.medico_id,
        paciente_cpf:   p.paciente_cpf,
        tipo:           'PEDIDO_EXAME',
        titulo:         'Pedido de Exame',
        arquivo_url:    JSON.stringify(conteudo),
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ ...conteudo, id: data.id, criado_em: data.criado_em });
  } catch (err) {
    console.error('[pedido exame]', err.message);
    res.status(500).json({erro: err.message});
  }
}

/* ── adicionarEvolucao ───────────────────────────────────────────── */
async function adicionarEvolucao(req, res) {
  const { prontuario_id, texto } = req.body;
  if (!prontuario_id || !texto) {
    return res.status(400).json({ erro: 'prontuario_id e texto são obrigatórios' });
  }

  try {
    const { data: p } = await supabase
      .from('prontuarios')
      .select('agendamento_id, paciente_cpf, medico_id')
      .eq('id', prontuario_id)
      .single();

    if (!p) return res.status(404).json({ erro: 'Prontuário não encontrado' });

    const { data, error } = await supabase
      .from('documentos')
      .insert([{
        agendamento_id: p.agendamento_id,
        medico_id:      p.medico_id,
        paciente_cpf:   p.paciente_cpf,
        tipo:           'EVOLUCAO',
        titulo:         'Evolução Clínica',
        arquivo_url:    texto,
      }])
      .select()
      .single();

    if (error) throw new Error(error.message);
    res.status(201).json({ id: data.id, texto: data.arquivo_url || data.titulo, criado_em: data.criado_em });
  } catch (err) {
    console.error('[evolucao]', err.message);
    res.status(500).json({erro: err.message});
  }
}

module.exports = {
  buscarPorAgendamento,
  buscarPorCPF,
  criar,
  atualizar,
  criarReceita,
  listarReceitas,
  criarAtestado,
  criarPedidoExame,
  adicionarEvolucao,
};
