/**
 * adminRoutes.js — Saúde 360
 * Rotas administrativas: KPIs, auditoria, faturamento, gestão.
 */
const express = require('express');
const router  = express.Router();
const { exigirPapel } = require('../middlewares/autenticacao');
const { auditarAcao } = require('../middlewares/auditoria');
const ctrl = require('../controllers/adminController');

// Todas as rotas exigem papel admin
router.use(exigirPapel('admin'));

router.get('/kpis',          ctrl.kpisGerais);
router.get('/consultas-dia', ctrl.consultasDoDia);
router.get('/ocupacao',      ctrl.ocupacaoPorDia);
router.get('/top-medicos',   ctrl.topMedicos);

router.get('/faturamento', ctrl.relatorioFaturamento);

router.get(
  '/auditoria',
  auditarAcao('VER_AUDITORIA', 'audit_log'),
  ctrl.listarAuditoria
);
router.get(
  '/lgpd/exportar/:usuario_id',
  auditarAcao('EXPORTAR_DADOS_LGPD', 'usuarios'),
  ctrl.exportarDadosPaciente
);

router.get('/usuarios',         ctrl.listarUsuarios);
router.patch('/usuarios/:id',   ctrl.ativarDesativarUsuario);

module.exports = router;
