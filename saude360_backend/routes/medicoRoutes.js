const express          = require('express');
const router           = express.Router();
const medicoController = require('../controllers/medicoController');

// TODO (Alisson): descomentar quando JWT estiver pronto
// const { autenticar } = require('../middlewares/autenticacao');
// router.get('/', autenticar, medicoController.listar);

router.get('/', medicoController.listar);

module.exports = router;
