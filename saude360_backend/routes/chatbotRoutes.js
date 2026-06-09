const express = require('express');
const router  = express.Router();
const { autenticar } = require('../middlewares/autenticacao');
const chatbot = require('../services/chatbotService');
const supabase = require('../config/db');
const rateLimit = require('express-rate-limit');

// Rate limit específico para chatbot (anti-spam)
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 minuto
  max: 20,              // máx 20 mensagens por minuto
  message: { erro: 'Muitas mensagens. Aguarde um momento.' },
});

router.post('/mensagem', chatLimiter, autenticar, async (req, res) => {
  const { mensagem, sessao_id } = req.body;

  if (!mensagem?.trim()) {
    return res.status(400).json({ erro: 'Mensagem não pode estar vazia' });
  }
  if (mensagem.length > 1000) {
    return res.status(400).json({ erro: 'Mensagem muito longa (máx. 1000 caracteres)' });
  }

  try {
    const nome = req.usuario?.nome || null;

    // Busca histórico da sessão para contexto
    let contexto = '';
    if (sessao_id) {
      const { data: hist } = await supabase
        .from('chatbot_historico')
        .select('role, mensagem')
        .eq('sessao_id', sessao_id)
        .order('criado_em', { ascending: false })
        .limit(5);

      if (hist?.length) {
        contexto = hist
          .reverse()
          .map(h => `${h.role === 'user' ? 'Usuário' : 'Assistente'}: ${h.mensagem}`)
          .join('\n');
      }
    }

    const resultado = await chatbot.processar(mensagem, nome, contexto);

    // Salva no histórico (async, não bloqueia)
    if (req.usuario?.id) {
      Promise.all([
        chatbot.salvarMensagem(req.usuario.id, 'user',      mensagem),
        chatbot.salvarMensagem(req.usuario.id, 'assistant', resultado.resposta),
      ]).catch(() => {});
    }

    res.json({
      resposta:  resultado.resposta,
      intent:    resultado.intent,
      acao:      resultado.acao,
      confianca: resultado.confianca,
    });
  } catch (err) {
    console.error('[chatbot]', err.message);
    res.status(500).json({
      resposta: 'Desculpe, ocorreu um erro temporário. Tente novamente em instantes. 🙏',
      intent:   'ERRO',
      acao:     null,
    });
  }
});

router.get('/historico', autenticar, async (req, res) => {
  const { limit = 20 } = req.query;
  // SEGURANÇA: nunca retornar mais de 100 mensagens de uma vez
  const limiteSanitizado = Math.min(Math.max(1, Number(limit) || 20), 100);
  try {
    const { data } = await supabase
      .from('chatbot_historico')
      .select('id, role, mensagem, intent, criado_em')
      .eq('usuario_id', req.usuario.id)
      .order('criado_em', { ascending: false })
      .limit(limiteSanitizado);

    res.json((data || []).reverse());
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar histórico' });
  }
});

router.get('/faq', async (_req, res) => {
  try {
    const { data } = await supabase
      .from('chatbot_faq')
      .select('id, pergunta, resposta')
      .eq('ativo', true)
      .order('id');
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar FAQ' });
  }
});

module.exports = router;
