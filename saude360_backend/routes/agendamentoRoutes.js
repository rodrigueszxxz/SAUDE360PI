const express               = require('express');
const router                = express.Router();
const agendamentoController = require('../controllers/agendamentoController');
const validarCPF            = require('../middlewares/validarCPF');

router.post('/',               validarCPF, agendamentoController.criar);
router.get('/hoje',            agendamentoController.listarHoje);
router.get('/meus',            agendamentoController.listarMeus);
router.get('/ocupados/:medicoId/:data', agendamentoController.listarOcupados);
router.get('/:id',             agendamentoController.buscar);
router.patch('/:id/status',    agendamentoController.atualizarStatus);
router.patch('/:id/cancelar',  agendamentoController.cancelar);

module.exports = router;
