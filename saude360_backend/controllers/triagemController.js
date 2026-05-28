const triagemService = require('../services/triagemService');

async function responder(req, res) {
  try {
    const { agendamento_id } = req.params;
    const { respostas } = req.body;
    const triagem = await triagemService.responderTriagem(agendamento_id, respostas);
    res.json({ mensagem: 'Triagem registrada com sucesso', triagem });
  } catch (err) {
    const status = err.message.includes('obrigatório') || err.message.includes('array') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

async function buscarResumo(req, res) {
  try {
    const resumo = await triagemService.buscarResumo(req.params.agendamento_id);
    res.json(resumo);
  } catch (err) {
    const status = err.message.includes('não encontrada') ? 404 : 500;
    res.status(status).json({ erro: err.message });
  }
}

module.exports = { responder, buscarResumo };
