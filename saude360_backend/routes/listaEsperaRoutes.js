const express = require('express');
const router = express.Router();
const listaEsperaController = require('../controllers/listaEsperaController');

router.post('/', listaEsperaController.entrarNaFila);
router.get('/meus', listaEsperaController.minhasListas);

// Rotas para Admin
router.get('/admin', listaEsperaController.listarAdmin);
router.post('/admin/:id/encaixar', listaEsperaController.confirmarEncaixe);
router.post('/admin/:id/pular', listaEsperaController.proximoFila);

module.exports = router;
