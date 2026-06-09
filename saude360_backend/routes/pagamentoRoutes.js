const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/pagamentoController');
const validarCPF = require('../middlewares/validarCPF');
const { exigirPapel } = require('../middlewares/autenticacao');

/**
 * @swagger
 * /pagamentos/pix:
 *   post:
 *     summary: Gera um código PIX copia e cola para pagamento (Interno)
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agendamento_id:
 *                 type: integer
 *               valor:
 *                 type: number
 *               cpf:
 *                 type: string
 *     responses:
 *       201:
 *         description: Código PIX gerado com sucesso
 */
router.post('/pix', exigirPapel('paciente', 'admin'), validarCPF, ctrl.criarPix);

/**
 * @swagger
 * /pagamentos/boleto:
 *   post:
 *     summary: Gera um código de barras para pagamento via boleto (Simulado)
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               agendamento_id:
 *                 type: integer
 *               valor:
 *                 type: number
 *               cpf:
 *                 type: string
 *     responses:
 *       201:
 *         description: Código de barras gerado com sucesso
 */
router.post('/boleto', exigirPapel('paciente', 'admin'), validarCPF, ctrl.criarBoleto);

/**
 * @swagger
 * /pagamentos/meus:
 *   get:
 *     summary: Lista todos os pagamentos do usuário logado
 *     tags: [Pagamentos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de pagamentos
 */
router.get('/meus', ctrl.meusPagementos);

router.get('/admin/relatorio', exigirPapel('admin'), ctrl.relatorioAdmin);

router.get('/:id/recibo', ctrl.gerarRecibo);

router.get('/:id', ctrl.consultar);

module.exports = router;

