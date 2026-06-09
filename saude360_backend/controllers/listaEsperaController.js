const listaEsperaService = require('../services/listaEsperaService');

async function entrarNaFila(req, res) {
  try {
    const paciente = req.usuario;
    const { medico_id, data_alvo, data, horario_alvo, horario } = req.body;
    
    const dataFinal = data || data_alvo;
    const horarioFinal = horario || horario_alvo || null;

    if (!medico_id || !dataFinal) {
      return res.status(400).json({ erro: 'Médico e Data são obrigatórios' });
    }

    const item = await listaEsperaService.entrarNaFila(
      paciente.nome || 'Paciente',
      paciente.whatsapp || null,
      medico_id,
      dataFinal,
      horarioFinal
    );
    res.status(201).json({ mensagem: 'Você entrou na lista de espera!', item });
  } catch (err) {
    console.error('Erro ao entrar na fila:', err.message);
    res.status(500).json({ erro: 'Erro ao entrar na fila de espera' });
  }
}

async function minhasListas(req, res) {
  try {
    // Since there's no paciente_id in the table, return empty or fetch by medico
    res.json([]);
  } catch (err) {
    console.error('Erro ao listar filas:', err.message);
    res.status(500).json({ erro: 'Erro ao listar fila de espera' });
  }
}

async function listarAdmin(req, res) {
  try {
    const { data: filas, error } = await require('../config/db')
      .from('lista_espera')
      .select(`
        id, data, horario, nome, whatsapp, posicao, status, criado_em,
        medicos(nome, especialidade)
      `)
      .eq('status', 'AGUARDANDO')
      .order('data', { ascending: true })
      .order('posicao', { ascending: true });

    if (error) throw new Error(error.message);
    res.json(filas || []);
  } catch (err) {
    console.error('Erro ao listar fila admin:', err.message);
    res.status(500).json({ erro: 'Erro ao listar fila de espera' });
  }
}

async function confirmarEncaixe(req, res) {
  try {
    const { id } = req.params;
    
    // Atualiza status na lista
    const { data: item, error } = await require('../config/db')
      .from('lista_espera')
      .update({ status: 'NOTIFICADO' })
      .eq('id', id)
      .select('*, medicos(nome)')
      .single();

    if (error) throw new Error(error.message);

    // Tenta encontrar o usuário pelo whatsapp/nome para notificar (opcional)
    const { data: user } = await require('../config/db')
      .from('usuarios')
      .select('id')
      .eq('whatsapp', item.whatsapp)
      .limit(1)
      .single();

    if (user) {
      await require('../services/notificacoesService').criarNotificacao(
        user.id,
        'Encaixe Confirmado',
        `Sua vaga com ${item.medicos?.nome || 'o médico'} foi confirmada!`
      );
    }
    
    // Notifica o médico
    if (item.medico_id) {
      await require('../services/notificacoesService').criarNotificacao(
        item.medico_id,
        'Novo Encaixe',
        `Paciente ${item.nome} foi encaixado na sua agenda.`
      );
    }

    res.json({ mensagem: 'Encaixe confirmado com sucesso', item });
  } catch (err) {
    console.error('Erro ao confirmar encaixe:', err.message);
    res.status(500).json({ erro: 'Erro ao confirmar encaixe' });
  }
}

async function proximoFila(req, res) {
  try {
    const { id } = req.params;
    
    const { data: item, error } = await require('../config/db')
      .from('lista_espera')
      .update({ status: 'PULADO' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new Error(error.message);

    res.json({ mensagem: 'Paciente pulado, chamando o próximo.', item });
  } catch (err) {
    console.error('Erro ao pular paciente:', err.message);
    res.status(500).json({ erro: 'Erro ao chamar o próximo da fila' });
  }
}

module.exports = { entrarNaFila, minhasListas, listarAdmin, confirmarEncaixe, proximoFila };
