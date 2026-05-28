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

module.exports = { entrarNaFila, minhasListas };
