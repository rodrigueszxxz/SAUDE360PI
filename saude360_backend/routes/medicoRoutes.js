const express          = require('express');
const router           = express.Router();
const medicoController = require('../controllers/medicoController');

// Lista de médicos é pública — necessária para BuscaMedicos sem login
// Dados retornados são apenas: nome, especialidade, foto, NPS (sem dados sensíveis)
router.get('/', medicoController.listar);

module.exports = router;
