/**
 * pacienteRoutes.js — Saúde 360
 *
 * Todas as rotas protegidas por autenticar() + apenasPropriosDados()
 * montados no app.js. Aqui só adicionamos verificações extras de papel.
 *
 * Regras:
 *  - Paciente: acessa apenas os próprios dados (CPF = CPF do token)
 *  - Médico:   pode ver histórico de qualquer paciente (para consulta)
 *  - Admin:    acesso total
 */
const express          = require('express');
const router           = express.Router();
const { exigirPapel }  = require('../middlewares/autenticacao');
const historicoService = require('../services/historicoService');
const qrRepository     = require('../repositories/qrRepository');
const supabase         = require('../config/db');

router.get('/:cpf/historico-medico', async (req, res) => {
  try {
    const resultado = await historicoService.buscarHistoricoMedico(
      req.params.cpf,
      req.query
    );
    res.json(resultado);
  } catch (err) {
    res.status(err.message.includes('obrigatório') ? 400 : 500)
       .json({ erro: err.message });
  }
});

router.get('/:cpf/timeline', async (req, res) => {
  try {
    const resultado = await historicoService.buscarTimeline(
      req.params.cpf,
      req.query
    );
    res.json(resultado);
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao buscar timeline' });
  }
});

// Retorna o qr_token do agendamento para o paciente exibir no app
router.get(
  '/checkin/qr/:agendamento_id',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const cpf = req.usuario?.cpf;
      const dados = await qrRepository.buscarQRPorAgendamento(
        req.params.agendamento_id,
        cpf
      );
      res.json(dados);
    } catch (err) {
      const status = err.message.includes('Acesso') ? 403
        : err.message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ erro: err.message });
    }
  }
);

router.post(
  '/qr/:agendamento_id/gerar',
  exigirPapel('admin'),
  async (req, res) => {
    try {
      const dados = await qrRepository.gerarQRToken(req.params.agendamento_id);
      res.json({ mensagem: 'QR Code gerado com sucesso', ...dados });
    } catch (err) {
      const status = err.message.includes('não encontrado') ? 404 : 400;
      res.status(status).json({ erro: err.message });
    }
  }
);

router.post(
  '/checkin/qr',
  exigirPapel('admin'),
  async (req, res) => {
    try {
      const { qr_token } = req.body;
      if (!qr_token) return res.status(400).json({ erro: 'qr_token é obrigatório' });

      const resultado = await qrRepository.validarQR(qr_token);
      res.json({ mensagem: 'Check-in realizado com sucesso', ...resultado });
    } catch (err) {
      const status = err.message.includes('inválido') || err.message.includes('já foi') ? 400 : 500;
      res.status(status).json({ erro: err.message });
    }
  }
);

// Só libera se: tipo=TELECONSULTA, status=CONFIRMADO, pertence ao paciente
router.get(
  '/teleconsulta/:agendamento_id',
  exigirPapel('paciente', 'medico', 'admin'),
  async (req, res) => {
    try {
      const { data: ag, error } = await supabase
        .from('agendamentos')
        .select('id, tipo_consulta, status, meet_link, cpf, data_consulta, horario, medicos(nome, especialidade)')
        .eq('id', req.params.agendamento_id)
        .single();

      if (error || !ag) return res.status(404).json({ erro: 'Agendamento não encontrado' });

      // Ownership: paciente só acessa o próprio
      if (req.usuario.papel === 'paciente' && ag.cpf !== req.usuario.cpf) {
        return res.status(403).json({ erro: 'Acesso negado' });
      }

      // Valida tipo
      if (ag.tipo_consulta !== 'TELECONSULTA') {
        return res.status(400).json({ erro: 'Esta consulta não é do tipo teleconsulta' });
      }

      // Valida pagamento (status deve ser CONFIRMADO ou além)
      const statusLiberados = ['CONFIRMADO', 'AGUARDANDO', 'CHECKIN_REALIZADO', 'EM_ATENDIMENTO'];
      if (!statusLiberados.includes(ag.status)) {
        return res.status(403).json({ erro: 'Teleconsulta disponível apenas após pagamento confirmado' });
      }

      if (!ag.meet_link) {
        return res.status(404).json({ erro: 'Link de teleconsulta não disponível' });
      }

      res.json({
        meet_link: ag.meet_link,
        data_consulta: ag.data_consulta,
        horario: ag.horario,
        medico: ag.medicos,
      });
    } catch (err) {
      console.error('[teleconsulta]', err.message);
      res.status(500).json({ erro: 'Erro ao buscar dados da teleconsulta' });
    }
  }
);

router.get(
  '/favoritos',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('medicos_favoritos')
        .select('medico_id, criado_em')
        .eq('usuario_id', req.usuario.id);
      if (error) throw new Error(error.message);
      res.json(data ?? []);
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao buscar favoritos' });
    }
  }
);

router.post(
  '/favoritos/:medico_id',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const { error } = await supabase
        .from('medicos_favoritos')
        .upsert(
          { usuario_id: req.usuario.id, medico_id: req.params.medico_id },
          { onConflict: 'usuario_id,medico_id' }
        );
      if (error) throw new Error(error.message);
      res.status(201).json({ mensagem: 'Médico favoritado' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao favoritar médico' });
    }
  }
);

router.delete(
  '/favoritos/:medico_id',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const { error } = await supabase
        .from('medicos_favoritos')
        .delete()
        .eq('usuario_id', req.usuario.id)
        .eq('medico_id', req.params.medico_id);
      if (error) throw new Error(error.message);
      res.json({ mensagem: 'Favorito removido' });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao remover favorito' });
    }
  }
);

router.get(
  '/perfil',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      // SEGURANÇA: nunca retornar senha_hash, ativo, papel interno ou campos sensíveis
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          id, nome, email, cpf, whatsapp, papel, foto_perfil,
          data_nascimento, nome_social, rg, sexo, estado_civil,
          telefone_fixo, cep, cidade, endereco,
          peso, altura, tipo_sanguineo, alergias, medicacoes,
          convenio_operadora, convenio_numero, convenio_tipo, convenio_validade,
          emergencia_nome, emergencia_parentesco, emergencia_telefone, emergencia_email,
          criado_em, atualizado_em
        `)
        .eq('id', req.usuario.id)
        .single();

      if (error) throw new Error(error.message);
      res.json(data);
    } catch (err) {
      console.error('[perfil GET]', err.message);
      res.status(500).json({ erro: 'Erro ao buscar perfil' });
    }
  }
);

router.patch(
  '/perfil',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const campos = {};
      // SEGURANÇA: CPF e e-mail são identificadores únicos e NÃO podem ser trocados pelo paciente.
      // Qualquer alteração nesses campos deve passar por processo de validação administrativa.
      const camposBasicos = ['nome', 'whatsapp'];
      const camposExtendidos = [
        'data_nascimento', 'nome_social', 'rg', 'sexo', 'estado_civil',
        'telefone_fixo', 'cep', 'cidade', 'endereco',
        'peso', 'altura', 'tipo_sanguineo', 'alergias', 'medicacoes',
        'convenio_operadora', 'convenio_numero', 'convenio_tipo',
        'convenio_validade', 'convenio_titular',
        'emergencia_nome', 'emergencia_parentesco', 'emergencia_telefone', 'emergencia_email',
        'foto_perfil',
      ];

      for (const k of [...camposBasicos, ...camposExtendidos]) {
        if (req.body[k] !== undefined) {
          if (k === 'convenio_validade' && req.body[k] && req.body[k].length === 7) {
            campos[k] = req.body[k] + '-01';
          } else {
            campos[k] = req.body[k] === '' ? null : req.body[k];
          }
        }
      }

            // Se convenio_operadora está sendo salvo, exige carteirinha e validade
      const operadoraSalva = campos.convenio_operadora;
      if (operadoraSalva && operadoraSalva !== 'Particular') {
        const numero   = campos.convenio_numero   ?? req.body.convenio_numero;
        const validade = campos.convenio_validade ?? req.body.convenio_validade;

        if (!numero || !validade) {
          return res.status(400).json({
            erro: 'Para salvar um convênio, informe o número da carteirinha e a validade.',
          });
        }
      }

      if (Object.keys(campos).length === 0) {
        return res.status(400).json({ erro: 'Nenhum campo para atualizar' });
      }
      campos.atualizado_em = new Date().toISOString();

      const { data, error } = await supabase
        .from('usuarios')
        .update(campos)
        .eq('id', req.usuario.id)
        .select('id, nome, email, cpf, papel, whatsapp, data_nascimento, sexo, tipo_sanguineo, peso, altura, convenio_operadora, convenio_numero, convenio_validade, convenio_titular, foto_perfil')
        .single();

      if (error) {
        console.warn('[perfil] Aviso ao salvar campos estendidos:', error.message);
        const camposFallback = {};
        for (const k of camposBasicos) {
          if (campos[k] !== undefined) camposFallback[k] = campos[k];
        }
        camposFallback.atualizado_em = new Date().toISOString();

        const { data: dataFallback, error: errorFallback } = await supabase
          .from('usuarios')
          .update(camposFallback)
          .eq('id', req.usuario.id)
          .select('id, nome, email, cpf, papel, whatsapp, foto_perfil')
          .single();

        if (errorFallback) throw new Error(errorFallback.message);
        return res.json({ mensagem: 'Perfil atualizado (dados básicos)', usuario: dataFallback });
      }

      res.json({ mensagem: 'Perfil atualizado', usuario: data });
    } catch (err) {
      console.error('[perfil]', err.message);
      res.status(500).json({ erro: 'Erro ao atualizar perfil' });
    }
  }
);

// Usado pelo frontend antes de ir para pagamento com convênio
router.get(
  '/perfil/completo',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('nome, cpf, convenio_operadora, convenio_numero, convenio_validade, convenio_titular')
        .eq('id', req.usuario.id)
        .single();

      if (error) throw new Error(error.message);

      const temConvenio = !!(data.convenio_operadora && data.convenio_operadora !== 'Particular');

      let convenioCompleto = true;
      let camposFaltando = [];

      if (temConvenio) {
        if (!data.convenio_numero) camposFaltando.push('número da carteirinha');
        if (!data.convenio_validade) camposFaltando.push('validade do plano');
        convenioCompleto = camposFaltando.length === 0;
      }

      res.json({
        completo: convenioCompleto,
        temConvenio,
        camposFaltando,
        perfil: data,
      });
    } catch (err) {
      res.status(500).json({ erro: 'Erro ao verificar perfil' });
    }
  }
);

router.post(
  '/avaliar/:agendamento_id',
  exigirPapel('paciente'),
  async (req, res) => {
    try {
      const { agendamento_id } = req.params;
      const { nota, comentario } = req.body;

      if (!nota || nota < 1 || nota > 5) {
        return res.status(400).json({ erro: 'A nota deve ser entre 1 e 5' });
      }

      const { data: ag, error: agError } = await supabase
        .from('agendamentos')
        .select('id, medico_id, status, cpf')
        .eq('id', agendamento_id)
        .single();

      if (agError || !ag) {
        return res.status(404).json({ erro: 'Agendamento não encontrado' });
      }

      if (ag.cpf !== req.usuario.cpf) {
        return res.status(403).json({ erro: 'Acesso negado' });
      }

      if (!['REALIZADO', 'CONCLUIDO'].includes(ag.status)) {
        return res.status(400).json({ erro: 'Apenas consultas realizadas podem ser avaliadas' });
      }

      const { data: aval } = await supabase
        .from('avaliacoes_nps')
        .select('id')
        .eq('agendamento_id', agendamento_id)
        .maybeSingle();

      if (aval) {
        return res.status(400).json({ erro: 'Esta consulta já foi avaliada' });
      }

      const { error: insError } = await supabase
        .from('avaliacoes_nps')
        .insert([{
          agendamento_id: ag.id,
          medico_id: ag.medico_id,
          paciente_cpf: req.usuario.cpf,
          nota: Number(nota),
          comentario: comentario || null,
        }]);

      if (insError) throw new Error(insError.message);

      const medicoRepository = require('../repositories/medicoRepository');
      await medicoRepository.atualizarNPS(ag.medico_id);

      res.status(201).json({ mensagem: 'Avaliação enviada com sucesso!' });
    } catch (err) {
      console.error('[avaliar]', err.message);
      res.status(500).json({ erro: 'Erro ao enviar avaliação' });
    }
  }
);

module.exports = router;
