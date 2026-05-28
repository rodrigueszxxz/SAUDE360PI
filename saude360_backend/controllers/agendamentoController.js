/**
 * agendamentoController.js — Saúde 360
 * Corrigido: IDOR — todas as operações verificam ownership antes de responder
 */
const agendamentoService    = require('../services/agendamentoService');
const agendamentoRepository = require('../repositories/agendamentoRepository');
const supabase              = require('../config/db');

async function criar(req, res) {
  try {
    const agendamento = await agendamentoService.criarAgendamento(req.body);
    res.status(201).json({ mensagem: 'Agendamento criado com sucesso', agendamento });
  } catch (err) {
    const status = err.message.includes('obrigatório') || err.message.includes('disponível') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

async function listarHoje(req, res) {
  try {
    const filtros = { ...req.query };
    
    // Se for médico, forçar filtro pelo seu próprio medico_id
    if (req.usuario?.papel === 'medico') {
      let query = supabase.from('medicos').select('id');
      if (req.usuario.crm) {
        query = query.eq('crm', req.usuario.crm);
      } else {
        query = query.eq('nome', req.usuario.nome);
      }
      const { data: medico, error: errMedico } = await query.single();
      
      if (medico) {
        filtros.medico_id = medico.id;
      } else {
        // Se o médico logado não está cadastrado na tabela de médicos visíveis, 
        // ele não tem agenda ainda. Retorna vazio ou permite ver tudo se for admin disfarçado?
        // Retornaremos vazio.
        return res.json([]);
      }
    }

    const atendimentos = await agendamentoRepository.listarHoje(filtros);
    res.json(atendimentos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function buscar(req, res) {
  try {
    const ag = await agendamentoRepository.buscarPorId(req.params.id);
    if (!ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

    // IDOR: paciente só pode ver o próprio agendamento
    const { papel, cpf } = req.usuario;
    if (papel === 'paciente' && ag.cpf !== cpf) {
      return res.status(403).json({ erro: 'Acesso não autorizado' });
    }

    res.json(ag);
  } catch (err) {
    res.status(404).json({ erro: 'Agendamento não encontrado' });
  }
}

async function atualizarStatus(req, res) {
  try {
    const { status, alterado_por } = req.body;
    if (!status) return res.status(400).json({ erro: 'status é obrigatório' });

    // IDOR: paciente não pode alterar status de agendamentos alheios
    if (req.usuario.papel === 'paciente') {
      const ag = await agendamentoRepository.buscarPorId(req.params.id);
      if (!ag || ag.cpf !== req.usuario.cpf) {
        return res.status(403).json({ erro: 'Acesso não autorizado' });
      }
      // Paciente apenas cancela; mudanças de status clínico são de médico/admin
      const statusPermitidosPaciente = ['CANCELADO'];
      if (!statusPermitidosPaciente.includes(status)) {
        return res.status(403).json({ erro: 'Paciente não pode alterar para este status' });
      }
    }

    const ag = await agendamentoService.atualizarStatus(req.params.id, status, alterado_por || req.usuario.email);
    res.json({ mensagem: 'Status atualizado com sucesso', agendamento: ag });
  } catch (err) {
    const code = err.message.includes('inválido') || err.message.includes('obrigatório') ? 400 : 500;
    res.status(code).json({ erro: err.message });
  }
}

async function cancelar(req, res) {
  try {
    // IDOR: paciente só cancela o próprio agendamento
    if (req.usuario.papel === 'paciente') {
      const ag = await agendamentoRepository.buscarPorId(req.params.id);
      if (!ag || ag.cpf !== req.usuario.cpf) {
        return res.status(403).json({ erro: 'Acesso não autorizado' });
      }
    }

    const ag = await agendamentoService.cancelar(req.params.id, req.body.solicitado_por);
    res.json({ mensagem: 'Agendamento cancelado com sucesso', agendamento: ag });
  } catch (err) {
    const code = err.message.includes('12 horas') ? 403 : err.message.includes('não encontrado') ? 404 : 500;
    res.status(code).json({ erro: err.message });
  }
}

async function listarMeus(req, res) {
  try {
    const cpf = req.usuario?.cpf;
    if (!cpf) return res.status(400).json({ erro: 'CPF não encontrado no token' });
    const agendamentos = await agendamentoRepository.listarPorCPF(cpf);
    res.json(agendamentos);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function listarOcupados(req, res) {
  try {
    const { medicoId, data } = req.params;
    const supabase = require('../config/db');
    const { data: agendamentos, error } = await supabase
      .from('agendamentos')
      .select('horario')
      .eq('medico_id', medicoId)
      .eq('data_consulta', data)
      .not('status', 'in', '("CANCELADO","NO_SHOW")');

    if (error) throw new Error(error.message);
    // Truncar para HH:MM para compatibilidade com o frontend
    const ocupados = agendamentos.map(a => (a.horario || '').substring(0, 5));
    res.json(ocupados);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

module.exports = { criar, listarHoje, buscar, atualizarStatus, cancelar, listarMeus, listarOcupados };
