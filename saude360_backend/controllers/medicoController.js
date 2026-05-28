const medicoService = require('../services/medicoService');

async function listar(req, res) {
  try {
    const medicos = await medicoService.listarMedicos(req.query);
    res.json(medicos);
  } catch (erro) {
    console.error('Erro ao listar médicos:', erro.message);
    res.status(500).json({ erro: 'Erro ao buscar médicos' });
  }
}

module.exports = { listar };
