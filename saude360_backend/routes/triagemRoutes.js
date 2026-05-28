const express            = require('express');
const router             = express.Router();
const triagemController  = require('../controllers/triagemController');

router.post('/:agendamento_id/resposta', triagemController.responder);

router.get('/resumo/:agendamento_id',    triagemController.buscarResumo);

module.exports = router;
