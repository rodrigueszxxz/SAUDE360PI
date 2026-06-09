const pagamentoService = require('../services/pagamentoService');
const pagamentoRepository = require('../repositories/pagamentoRepository');
const pdfService = require('../services/pdfService');

async function criarPix(req, res) {
  try {
    const { nome, cpf, valor, agendamento_id, convenio, carteirinha, nome_titular, validade_plano } = req.body;
    const pagamento = await pagamentoService.criarPix(
      nome || req.usuario?.nome,
      cpf || req.usuario?.cpf,
      valor,
      agendamento_id,
      convenio,
      carteirinha,
      nome_titular,
      validade_plano
    );
    res.status(201).json({ mensagem: 'PIX criado com sucesso', pagamento });
  } catch (err) {
    console.error('[criarPix]', err.message);
    const errosBadRequest = ['obrigatório', 'valor', 'convênio', 'carteirinha', 'titular', 'validade', 'suportado'];
    if (errosBadRequest.some(k => err.message.toLowerCase().includes(k))) {
      return res.status(400).json({ erro: err.message });
    }
    res.status(500).json({ erro: 'Erro ao criar pagamento' });
  }
}

async function criarBoleto(req, res) {
  try {
    const { nome, cpf, valor, agendamento_id, convenio, carteirinha, nome_titular, validade_plano } = req.body;
    const pagamento = await pagamentoService.criarBoleto(
      nome || req.usuario?.nome,
      cpf || req.usuario?.cpf,
      valor,
      agendamento_id,
      convenio,
      carteirinha,
      nome_titular,
      validade_plano
    );
    res.status(201).json({ mensagem: 'Boleto criado com sucesso', pagamento });
  } catch (err) {
    console.error('[criarBoleto]', err.message);
    const errosBadRequest = ['obrigatório', 'valor', 'convênio', 'carteirinha', 'titular', 'validade', 'suportado'];
    if (errosBadRequest.some(k => err.message.toLowerCase().includes(k))) {
      return res.status(400).json({ erro: err.message });
    }
    res.status(500).json({ erro: 'Erro ao criar boleto' });
  }
}

async function consultar(req, res) {
  try {
    const pagamento = await pagamentoService.consultarPagamento(req.params.id);
    res.json(pagamento);
  } catch (err) {
    console.error('[consultar pagamento]', err.message);
    if (err.message.includes('não encontrado')) return res.status(404).json({ erro: err.message });
    res.status(500).json({ erro: 'Erro ao consultar pagamento' });
  }
}


async function webhookInterno(req, res) {
  // Protegido por segredo — NUNCA expor sem validação
  const segredo = req.headers['x-webhook-secret'];
  if (!segredo || segredo !== process.env.WEBHOOK_SECRET) {
    console.warn('[webhook interno] Tentativa sem segredo válido de', req.ip);
    return res.status(401).json({ erro: 'Não autorizado' });
  }

  try {
    const id = req.body.pagamento_id ?? req.body.id;
    if (!id) return res.status(400).json({ erro: 'ID do pagamento é obrigatório' });
    const pagamento = await pagamentoService.confirmarPagamento(id);
    res.json({ mensagem: 'Pagamento confirmado com sucesso', pagamento });
  } catch (err) {
    console.error('[webhook interno]', err.message);
    if (err.message.includes('não encontrado')) return res.status(404).json({ erro: err.message });
    if (err.message.includes('expirado') || err.message.includes('status')) {
      return res.status(400).json({ erro: err.message });
    }
    res.status(500).json({ erro: 'Erro ao confirmar pagamento' });
  }
}

async function meusPagementos(req, res) {
  try {
    const cpf = req.usuario?.cpf;
    if (!cpf) return res.status(400).json({ erro: 'CPF não encontrado no token' });
    const pagamentos = await pagamentoRepository.buscarPorCPF(cpf);
    res.json(pagamentos);
  } catch (err) {
    console.error('[meusPagementos]', err.message);
    res.status(500).json({ erro: 'Erro ao buscar pagamentos' });
  }
}

async function relatorioAdmin(req, res) {
  try {
    const supabase = require('../config/db');
    const { data: pagamentos, error } = await supabase
      .from('pagamentos')
      .select('status, valor, criado_em');

    if (error) throw new Error(error.message);

    const relatorio = {
      total_faturado: 0,
      total_pendente: 0,
      total_reembolsado: 0,
      total_credito_retido: 0,
      quantidade_vendas: 0,
    };

    for (const p of pagamentos) {
      const val = Number(p.valor);
      if (p.status === 'PAGO') {
        relatorio.total_faturado += val;
        relatorio.quantidade_vendas++;
      } else if (p.status === 'PENDENTE') {
        relatorio.total_pendente += val;
      } else if (p.status === 'REEMBOLSADO') {
        relatorio.total_reembolsado += val;
      } else if (p.status === 'CREDITO_RETIDO') {
        relatorio.total_credito_retido += val;
      }
    }

    relatorio.total_faturado = Number(relatorio.total_faturado.toFixed(2));
    relatorio.total_pendente = Number(relatorio.total_pendente.toFixed(2));
    res.json(relatorio);
  } catch (err) {
    console.error('[relatorioAdmin]', err.message);
    res.status(500).json({ erro: 'Erro ao gerar relatório' });
  }
}

async function gerarRecibo(req, res) {
  try {
    const { id } = req.params;
    const pagamento = await pagamentoRepository.buscarPorId(id);
    if (!pagamento) return res.status(404).json({ erro: 'Pagamento não encontrado' });

    if (req.usuario.papel !== 'admin' && req.usuario.cpf !== pagamento.cpf) {
      return res.status(403).json({ erro: 'Acesso negado ao recibo' });
    }

    if (pagamento.status !== 'PAGO') {
      return res.status(400).json({ erro: 'Apenas pagamentos confirmados podem gerar recibo' });
    }

    const paciente = { nome: req.usuario.nome, cpf: req.usuario.cpf };
    const pdfBuffer = await pdfService.gerarReciboPDF(pagamento, paciente);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="recibo-${pagamento.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('[gerarRecibo]', err.message);
    res.status(500).json({ erro: 'Erro ao gerar recibo em PDF' });
  }
}

module.exports = {
  criarPix,
  criarBoleto,
  consultar,
  webhookInterno,
  meusPagementos,
  relatorioAdmin,
  gerarRecibo,
};
