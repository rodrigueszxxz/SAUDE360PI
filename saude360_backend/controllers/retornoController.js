const retornoService = require('../services/retornoService');

async function sugerir(req, res) {
  try {
    const lembrete = await retornoService.sugerirRetorno(req.body);
    res.status(201).json({ mensagem: 'Retorno sugerido com sucesso', lembrete });
  } catch (err) {
    const status = err.message.includes('obrigatório') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

async function listar(req, res) {
  try {
    const lembretes = await retornoService.listarLembretes(req.query);
    res.json(lembretes);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function descartar(req, res) {
  try {
    const lembrete = await retornoService.descartar(req.params.id);
    res.json({ mensagem: 'Lembrete descartado', lembrete });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function processarResposta(req, res) {
  try {
    const { id } = req.params;
    const { resposta } = req.body;
    const resultado = await retornoService.processarResposta(id, resposta);
    res.json({
      mensagem: `Resposta '${resposta}' registrada com sucesso`,
      ...resultado
    });
  } catch (err) {
    const status = err.message.includes('obrigatório') || err.message.includes('inválida') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

module.exports = { sugerir, listar, descartar, processarResposta };
