const express = require('express');
const router  = express.Router();
const { exigirPapel } = require('../middlewares/autenticacao');
const supabase = require('../config/db');
const slotService = require('../services/slotGeneratorService');

// Listar disponibilidade do médico (público - para grade de horários)
router.get('/medico/:medico_id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('disponibilidade_medica')
      .select('*')
      .eq('medico_id', req.params.medico_id)
      .eq('ativo', true)
      .order('dia_semana');

    if (error) throw new Error(error.message);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar disponibilidade' });
  }
});

// Criar/atualizar disponibilidade (médico ou admin)
router.post(
  '/',
  exigirPapel('medico', 'admin'),
  async (req, res) => {
    const { medico_id, dia_semana, hora_inicio, hora_fim, duracao_consulta_min, max_consultas_dia, modalidade } = req.body;

    if (!medico_id || dia_semana === undefined || !hora_inicio || !hora_fim) {
      return res.status(400).json({ erro: 'medico_id, dia_semana, hora_inicio e hora_fim são obrigatórios' });
    }

    if (hora_inicio >= hora_fim) {
      return res.status(400).json({ erro: 'hora_fim deve ser maior que hora_inicio' });
    }

    // SEGURANÇA IDOR: médico só pode editar a própria disponibilidade
    if (req.usuario.papel === 'medico') {
      const { autenticar: _, ...__ } = require('../middlewares/autenticacao');
      const supabase = require('../config/db');
      let q = supabase.from('medicos').select('id');
      if (req.usuario.crm) q = q.eq('crm', req.usuario.crm);
      else q = q.eq('nome', req.usuario.nome);
      const { data: medicoRow } = await q.maybeSingle();
      if (!medicoRow || String(medicoRow.id) !== String(medico_id)) {
        return res.status(403).json({ erro: 'Você só pode editar a própria disponibilidade' });
      }
    }

    try {
      const { data, error } = await supabase
        .from('disponibilidade_medica')
        .upsert([{
          medico_id,
          dia_semana,
          hora_inicio,
          hora_fim,
          duracao_consulta_min: duracao_consulta_min || 30,
          max_consultas_dia:    max_consultas_dia    || null,
          modalidade:           modalidade           || 'AMBOS',
          ativo:                true,
          atualizado_em:        new Date().toISOString(),
        }], { onConflict: 'medico_id,dia_semana,hora_inicio' })
        .select()
        .single();

      if (error) throw new Error(error.message);
      res.status(201).json(data);
    } catch (err) {
      console.error('[disponibilidade criar]', err.message);
      res.status(500).json({ erro: 'Erro ao salvar disponibilidade' });
    }
  }
);

// Deletar linha de disponibilidade
router.delete(
  '/:id',
  exigirPapel('medico', 'admin'),
  async (req, res) => {
    try {
      const { error } = await supabase
        .from('disponibilidade_medica')
        .update({ ativo: false })
        .eq('id', req.params.id);

      if (error) throw new Error(error.message);
      res.json({ mensagem: 'Disponibilidade removida' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao remover disponibilidade' });
    }
  }
);

router.get('/medico/:medico_id/pausas', async (req, res) => {
  try {
    const { data } = await supabase
      .from('pausas_medico')
      .select('*')
      .eq('medico_id', req.params.medico_id)
      .eq('ativo', true);
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar pausas' });
  }
});

router.post('/pausas', exigirPapel('medico', 'admin'), async (req, res) => {
  const { medico_id, dia_semana, hora_inicio_pausa, hora_fim_pausa, descricao } = req.body;
  if (!medico_id || dia_semana === undefined || !hora_inicio_pausa || !hora_fim_pausa) {
    return res.status(400).json({ erro: 'Campos obrigatórios faltando' });
  }
  try {
    const { data, error } = await supabase
      .from('pausas_medico')
      .insert([{ medico_id, dia_semana, hora_inicio_pausa, hora_fim_pausa, descricao: descricao || 'Pausa' }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar pausa' });
  }
});

router.get('/medico/:medico_id/bloqueios', async (req, res) => {
  try {
    const { data } = await supabase
      .from('bloqueios_agenda')
      .select('*')
      .eq('medico_id', req.params.medico_id)
      .gte('data_fim', new Date().toISOString().split('T')[0])
      .order('data_inicio');
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar bloqueios' });
  }
});

router.post('/bloqueios', exigirPapel('medico', 'admin'), async (req, res) => {
  const { medico_id, data_inicio, data_fim, hora_inicio, hora_fim, motivo, tipo } = req.body;
  if (!medico_id || !data_inicio || !data_fim) {
    return res.status(400).json({ erro: 'medico_id, data_inicio e data_fim são obrigatórios' });
  }
  if (data_fim < data_inicio) {
    return res.status(400).json({ erro: 'data_fim deve ser >= data_inicio' });
  }
  try {
    const { data, error } = await supabase
      .from('bloqueios_agenda')
      .insert([{
        medico_id, data_inicio, data_fim,
        hora_inicio: hora_inicio || null,
        hora_fim:    hora_fim    || null,
        motivo:      motivo      || 'Bloqueio',
        tipo:        tipo        || 'AUSENCIA',
        criado_por:  req.usuario.id,
      }])
      .select()
      .single();
    if (error) throw new Error(error.message);
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao criar bloqueio' });
  }
});

router.delete('/bloqueios/:id', exigirPapel('medico', 'admin'), async (req, res) => {
  try {
    const { error } = await supabase
      .from('bloqueios_agenda')
      .delete()
      .eq('id', req.params.id);
    if (error) throw new Error(error.message);
    res.json({ mensagem: 'Bloqueio removido' });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao remover bloqueio' });
  }
});

/**
 * POST /disponibilidade/gerar-slots
 * Gera slots automaticamente baseado na disponibilidade configurada.
 * Parâmetros: medico_id, data_inicio, data_fim
 */
router.post(
  '/gerar-slots',
  exigirPapel('medico', 'admin'),
  async (req, res) => {
    const { medico_id, data_inicio, data_fim } = req.body;
    if (!medico_id || !data_inicio || !data_fim) {
      return res.status(400).json({ erro: 'medico_id, data_inicio e data_fim são obrigatórios' });
    }
    try {
      const resultado = await slotService.gerarSlots(medico_id, data_inicio, data_fim);
      res.json(resultado);
    } catch (err) {
      console.error('[gerar-slots]', err.message);
      res.status(500).json({ erro: err.message || 'Erro ao gerar slots' });
    }
  }
);

module.exports = router;
