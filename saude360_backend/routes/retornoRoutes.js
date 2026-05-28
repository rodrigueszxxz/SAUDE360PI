const express            = require('express');
const router             = express.Router();
const retornoController  = require('../controllers/retornoController');

router.post('/sugerir',              retornoController.sugerir);

router.get('/lembretes',             retornoController.listar);

router.patch('/lembretes/:id/descartar', retornoController.descartar);

router.post('/:id/resposta',         retornoController.processarResposta);

module.exports = router;
