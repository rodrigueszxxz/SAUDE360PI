/**
 * notificacoesRoutes.js — Saúde 360
 * GET /notificacoes/minhas — listar notificações do usuário logado
 * PATCH /notificacoes/:id/lida — marcar como lida
 * PATCH /notificacoes/lidas-todas — marcar todas como lidas
 */
const express  = require('express');
const router   = express.Router();
const supabase = require('../config/db');

// GET /notificacoes/minhas
router.get('/minhas', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('notificacoes')
      .select('*')
      .eq('usuario_id', req.usuario.id)
      .order('criado_em', { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    res.json(data ?? []);
  } catch (err) {
    console.error('[notificacoes GET]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar notificações' });
  }
});

// GET /notificacoes/nao-lidas (contagem)
router.get('/nao-lidas', async (req, res) => {
  try {
    const { count, error } = await supabase
      .from('notificacoes')
      .select('id', { count: 'exact', head: true })
      .eq('usuario_id', req.usuario.id)
      .eq('lida', false);

    if (error) throw new Error(error.message);
    res.json({ count: count ?? 0 });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao contar notificações' });
  }
});

// PATCH /notificacoes/:id/lida
router.patch('/:id/lida', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('id', req.params.id)
      .eq('usuario_id', req.usuario.id);

    if (error) throw new Error(error.message);
    res.json({ mensagem: 'Notificação marcada como lida' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao atualizar notificação' });
  }
});

// PATCH /notificacoes/lidas-todas
router.patch('/lidas-todas', async (req, res) => {
  try {
    const { error } = await supabase
      .from('notificacoes')
      .update({ lida: true })
      .eq('usuario_id', req.usuario.id)
      .eq('lida', false);

    if (error) throw new Error(error.message);
    res.json({ mensagem: 'Todas notificações marcadas como lidas' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao marcar notificações' });
  }
});

module.exports = router;
