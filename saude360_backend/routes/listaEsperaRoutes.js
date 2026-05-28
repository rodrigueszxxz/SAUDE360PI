const express = require('express');
const router = express.Router();
const listaEsperaController = require('../controllers/listaEsperaController');

router.post('/', listaEsperaController.entrarNaFila);
router.get('/meus', listaEsperaController.minhasListas);

module.exports = router;
