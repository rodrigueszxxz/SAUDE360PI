const agendaService = require('../services/agendaService');

async function listarSlots(req, res) {
  try {
    const slots = await agendaService.listarSlots(req.query);
    res.json(slots);
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
}

async function bloquear(req, res) {
  try {
    const slot = await agendaService.bloquear(req.body);
    res.status(201).json({ mensagem: 'Horário bloqueado com sucesso', slot });
  } catch (err) {
    const status = err.message.includes('obrigatório') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

async function desbloquear(req, res) {
  try {
    const slot = await agendaService.desbloquear(req.params.id);
    res.json({ mensagem: 'Horário desbloqueado com sucesso', slot });
  } catch (err) {
    const status = err.message.includes('não encontrado') ? 404 : 500;
    res.status(status).json({ erro: err.message });
  }
}

async function mover(req, res) {
  try {
    const agendamento = await agendaService.mover(req.body);
    res.json({ mensagem: 'Agendamento movido com sucesso', agendamento });
  } catch (err) {
    const status = err.message.includes('obrigatório') || err.message.includes('disponível') ? 400 : 500;
    res.status(status).json({ erro: err.message });
  }
}

module.exports = { listarSlots, bloquear, desbloquear, mover };
