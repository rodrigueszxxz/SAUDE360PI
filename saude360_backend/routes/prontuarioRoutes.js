/**
 * prontuarioRoutes.js — Saúde 360
 * Rotas do prontuário médico, receitas, atestados e pedidos de exame.
 */
const express = require('express');
const router  = express.Router();
const { exigirPapel } = require('../middlewares/autenticacao');
const ctrl = require('../controllers/prontuarioController');

// Buscar prontuário por agendamento
router.get(
  '/agendamento/:agendamento_id',
  exigirPapel('medico', 'admin', 'paciente'),
  ctrl.buscarPorAgendamento
);

// Listar histórico de prontuários por CPF
router.get(
  '/paciente/:cpf',
  exigirPapel('medico', 'admin', 'paciente'),
  ctrl.buscarPorCPF
);

// Criar prontuário (somente médico/admin)
router.post(
  '/',
  exigirPapel('medico', 'admin'),
  ctrl.criar
);

// Atualizar prontuário (somente médico/admin)
router.patch(
  '/:id',
  exigirPapel('medico', 'admin'),
  ctrl.atualizar
);

// Emitir receita
router.post(
  '/receitas',
  exigirPapel('medico', 'admin'),
  ctrl.criarReceita
);

// Listar receitas do paciente
router.get(
  '/receitas/paciente/:cpf',
  exigirPapel('medico', 'admin', 'paciente'),
  ctrl.listarReceitas
);

// Emitir atestado
router.post(
  '/atestados',
  exigirPapel('medico', 'admin'),
  ctrl.criarAtestado
);

// Solicitar exames
router.post(
  '/pedidos-exame',
  exigirPapel('medico', 'admin'),
  ctrl.criarPedidoExame
);

// Adicionar evolução clínica
router.post(
  '/evolucoes',
  exigirPapel('medico', 'admin'),
  ctrl.adicionarEvolucao
);

module.exports = router;
