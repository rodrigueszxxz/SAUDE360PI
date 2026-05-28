const express         = require('express');
const router          = express.Router();
const agendaController = require('../controllers/agendaController');

router.get('/',                  agendaController.listarSlots);

router.post('/bloquear',         agendaController.bloquear);

router.delete('/desbloquear/:id', agendaController.desbloquear);

router.patch('/mover',           agendaController.mover);

module.exports = router;
