const pagamentoRepository = require('../repositories/pagamentoRepository');
const stripeService = require('./stripeService');
const supabase = require('../config/db');
const crypto = require('crypto');

function gerarCodigoPix() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let codigo = '000201';
  for (let i = 0; i < 20; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

function calcularValor(valor, convenio) {
  const VALOR_BASE = (valor !== undefined && valor !== null && !isNaN(valor))
    ? parseFloat(valor)
    : parseFloat(process.env.STRIPE_VALOR_BASE || '60.00');
  let valorNum = VALOR_BASE;

  if (convenio && convenio !== 'Particular') {
    const conveniosPermitidos = ['UNIMED', 'HAPVIDA', 'BRADESCO SAÚDE'];
    const convenioUpper = convenio.toUpperCase();
    if (!conveniosPermitidos.includes(convenioUpper)) {
      throw new Error(`Convênio não suportado. Permitidos: ${conveniosPermitidos.join(', ')}`);
    }
    let desconto = 0;
    if (convenioUpper === 'UNIMED') desconto = 0.20;
    else if (convenioUpper === 'HAPVIDA') desconto = 0.15;
    else if (convenioUpper === 'BRADESCO SAÚDE') desconto = 0.10;
    valorNum = VALOR_BASE - VALOR_BASE * desconto;
  }

  return Number(valorNum.toFixed(2));
}

async function criarCheckoutStripe({ nome, cpf, valor, agendamento_id, convenio, carteirinha, nome_titular, validade_plano }) {
  if (!nome || !cpf) throw new Error('Nome e CPF são obrigatórios');

  const valorFinal = calcularValor(valor, convenio);

  if (convenio && convenio !== 'Particular') {
    if (!carteirinha || !nome_titular || !validade_plano) {
      throw new Error('Para convênio, informe a carteirinha, nome do titular e validade');
    }
    const validade = new Date(validade_plano);
    const agora = new Date();
    // Considera o plano válido até o último dia do mês
    agora.setDate(1);
    agora.setHours(0, 0, 0, 0);
    if (isNaN(validade.getTime()) || validade < agora) {
      throw new Error('Convênio vencido ou validade inválida');
    }
  }

  const pagamento = await pagamentoRepository.criar({
    nome,
    cpf,
    valor: valorFinal,
    agendamento_id: agendamento_id || null,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const valorCentavos = Math.round(valorFinal * 100);

  const { session_id, checkout_url, expires_at } = await stripeService.criarCheckoutSession({
    agendamento_id,
    pagamento_id: pagamento.id,
    nome_paciente: nome,
    cpf,
    valor_centavos: valorCentavos,
    descricao: `Consulta Médica — Saúde360${convenio && convenio !== 'Particular' ? ` (${convenio})` : ''}`,
    success_url: `${frontendUrl}/pagamento/sucesso?session_id={CHECKOUT_SESSION_ID}&pagamento_id=${pagamento.id}`,
    cancel_url: `${frontendUrl}/pagamento/cancelado?pagamento_id=${pagamento.id}&agendamento_id=${agendamento_id || ''}`,
    metadata: { convenio: convenio || 'Particular' },
  });

  await supabase.from('pagamentos').update({
    stripe_session_id: session_id,
    expira_em: expires_at,
  }).eq('id', pagamento.id);

  return {
    pagamento: { ...pagamento, stripe_session_id: session_id },
    checkout_url,
    session_id,
    valor_final: valorFinal,
  };
}

async function criarPix(nome, cpf, valor, agendamento_id, convenio, carteirinha, nome_titular, validade_plano) {
  if (!nome || !cpf) throw new Error('Nome e CPF são obrigatórios');

  const valorFinal = calcularValor(valor, convenio);

  if (convenio && convenio !== 'Particular') {
    if (!carteirinha || !nome_titular || !validade_plano) {
      throw new Error('Para utilizar convênio, informe a carteirinha, nome do titular e validade do plano');
    }
    const validade = new Date(validade_plano);
    const agora = new Date();
    agora.setDate(1);
    agora.setHours(0, 0, 0, 0);
    if (isNaN(validade.getTime()) || validade < agora) {
      throw new Error('Convênio vencido ou validade inválida');
    }
  }

  const codigo_pix = gerarCodigoPix();
  const expira_em = new Date(Date.now() + 15 * 60 * 1000);

  const pagamento = await pagamentoRepository.criar({
    nome,
    cpf,
    valor: valorFinal,
    codigo_pix,
    expira_em,
    agendamento_id: agendamento_id || null,
  });

  return { ...pagamento, valor_final: valorFinal };
}

async function criarBoleto(nome, cpf, valor, agendamento_id, convenio, carteirinha, nome_titular, validade_plano) {
  if (!nome || !cpf) throw new Error('Nome e CPF são obrigatórios');

  const valorFinal = calcularValor(valor, convenio);

  if (convenio && convenio !== 'Particular') {
    if (!carteirinha || !nome_titular || !validade_plano) {
      throw new Error('Para utilizar convênio, informe a carteirinha, nome do titular e validade do plano');
    }
    const validade = new Date(validade_plano);
    const agora = new Date();
    agora.setDate(1);
    agora.setHours(0, 0, 0, 0);
    if (isNaN(validade.getTime()) || validade < agora) {
      throw new Error('Convênio vencido ou validade inválida');
    }
  }

  // Simulação de código de barras
  const codigo_barras = `34191.09008 61713.957308 71444.640008 1 930000000${valorFinal.toFixed(2).replace(".","")}`;
  
  // Boleto expira em 3 dias
  const expira_em = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);

  const pagamento = await pagamentoRepository.criar({
    nome,
    cpf,
    valor: valorFinal,
    codigo_pix: codigo_barras, // Reutilizando a coluna para armazenar o código
    expira_em,
    agendamento_id: agendamento_id || null,
  });

  return { ...pagamento, valor_final: valorFinal, codigo_barras };
}

async function consultarPagamento(id) {
  const pagamento = await pagamentoRepository.buscarPorId(id);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  if (pagamento.stripe_session_id && pagamento.status === 'PENDENTE') {
    try {
      const session = await stripeService.buscarSession(pagamento.stripe_session_id);
      if (session.payment_status === 'paid' && pagamento.status !== 'PAGO') {
        const atualizado = await pagamentoRepository.atualizarStatus(pagamento.id, 'PAGO', {
          stripe_payment_intent: session.payment_intent,
        });
        return atualizado;
      }
    } catch (err) {
      console.warn('[pagamentoService] Falha ao verificar sessão Stripe:', err.message);
    }
  }

  return pagamento;
}

async function confirmarPagamento(id) {
  const pagamento = await pagamentoRepository.buscarPorId(id);
  if (!pagamento) throw new Error('Pagamento não encontrado');

  if (pagamento.status === 'PAGO') return pagamento;

  if (!['PENDENTE'].includes(pagamento.status)) {
    throw new Error(`Pagamento está com status: ${pagamento.status}`);
  }

  if (pagamento.expira_em && new Date() > new Date(pagamento.expira_em)) {
    await pagamentoRepository.atualizarStatus(id, 'EXPIRADO');
    throw new Error('PIX expirado — não é possível confirmar');
  }

  const pago = await pagamentoRepository.atualizarStatus(id, 'PAGO');

  if (pagamento.agendamento_id) {
    const agId = pagamento.agendamento_id;
    const qr_token = crypto.randomUUID();

    await supabase.from('agendamentos').update({
      status: 'CONFIRMADO',
      qr_token,
      atualizado_em: new Date().toISOString(),
    }).eq('id', agId);

    await supabase.from('status_log').insert([{
      agendamento_id: agId,
      status_anterior: 'PENDENTE_PAGAMENTO',
      status_novo: 'CONFIRMADO',
      alterado_por: 'PAGAMENTO_AUTOMATICO',
    }]).then(() => {}).catch(() => {});

    if (pagamento.cpf) {
      const { data: usuario } = await supabase
        .from('usuarios').select('id').eq('cpf', pagamento.cpf).single();
      if (usuario) {
        await supabase.from('notificacoes').insert([{
          usuario_id: usuario.id,
          titulo: '✅ Pagamento confirmado!',
          mensagem: 'Sua consulta está confirmada. Apresente o QR Code na recepção.',
          tipo: 'success',
          link: '/paciente/portal',
        }]);
      }
    }
  }

  return pago;
}

async function verificarExpirados() {
  try {
    const expirados = await pagamentoRepository.buscarExpirados();
    for (const pag of expirados) {
      await pagamentoRepository.atualizarStatus(pag.id, 'EXPIRADO');
      console.log(`[pagamento] PIX ${pag.id} expirado automaticamente`);
    }
  } catch (err) {
    console.error('[pagamento] Erro ao verificar expirados:', err.message);
  }
}

module.exports = { criarCheckoutStripe, criarPix, criarBoleto, consultarPagamento, confirmarPagamento, verificarExpirados };
