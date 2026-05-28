const supabase = require('../config/db');

let stripeClient = null;
let stripeDisponivel = false;

function obterStripe() {
  if (stripeClient !== null) return stripeClient;

  const chave = process.env.STRIPE_SECRET_KEY;
  if (!chave || chave.startsWith('sk_test_SUBSTITUA') || chave === '') {
    console.warn('[Stripe] STRIPE_SECRET_KEY não configurado — pagamentos serão simulados.');
    stripeDisponivel = false;
    stripeClient = false;
    return null;
  }

  try {
    const Stripe = require('stripe');
    stripeClient = Stripe(chave, { apiVersion: '2024-04-10' });
    stripeDisponivel = true;
    console.log('[Stripe] ✅ Cliente Stripe inicializado.');
    return stripeClient;
  } catch (err) {
    console.error('[Stripe] Falha ao inicializar:', err.message);
    stripeClient = false;
    stripeDisponivel = false;
    return null;
  }
}

function estaDisponivel() {
  obterStripe();
  return stripeDisponivel;
}

async function criarCheckoutSession({
  agendamento_id,
  pagamento_id,
  nome_paciente,
  cpf,
  valor_centavos,
  descricao,
  success_url,
  cancel_url,
  metadata = {},
}) {
  const stripe = obterStripe();
  if (!stripe) throw new Error('Stripe não configurado');

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: process.env.STRIPE_CURRENCY || 'brl',
          product_data: {
            name: descricao || 'Consulta Médica — Saúde360',
            description: `Agendamento #${agendamento_id}`,
            metadata: { agendamento_id: String(agendamento_id) },
          },
          unit_amount: valor_centavos,
        },
        quantity: 1,
      },
    ],
    customer_email: undefined,
    metadata: {
      pagamento_id: String(pagamento_id),
      agendamento_id: String(agendamento_id),
      cpf,
      nome_paciente,
      ...metadata,
    },
    success_url,
    cancel_url,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });

  return {
    session_id: session.id,
    checkout_url: session.url,
    expires_at: new Date(session.expires_at * 1000).toISOString(),
  };
}

async function processarWebhookStripe(payload, assinatura) {
  const stripe = obterStripe();
  if (!stripe) throw new Error('Stripe não configurado');

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) throw new Error('STRIPE_WEBHOOK_SECRET não configurado');

  let evento;
  try {
    evento = stripe.webhooks.constructEvent(payload, assinatura, webhookSecret);
  } catch (err) {
    throw new Error(`Assinatura inválida: ${err.message}`);
  }

  console.log(`[Stripe Webhook] Evento: ${evento.type} — ID: ${evento.id}`);

  const { registrarAuditoria } = require('../middlewares/auditoria');

  switch (evento.type) {
    case 'checkout.session.completed': {
      const session = evento.data.object;
      const pagamento_id = session.metadata?.pagamento_id;
      const agendamento_id = session.metadata?.agendamento_id;

      if (!pagamento_id) {
        console.warn('[Stripe Webhook] checkout.session.completed sem pagamento_id');
        break;
      }

      const { data: pagAtual } = await supabase
        .from('pagamentos')
        .select('id, status')
        .eq('id', pagamento_id)
        .single();

      if (pagAtual?.status === 'PAGO') {
        console.log(`[Stripe Webhook] Pagamento ${pagamento_id} já confirmado — idempotência OK`);
        break;
      }

      await supabase.from('pagamentos').update({
        status: 'PAGO',
        stripe_session_id: session.id,
        stripe_payment_intent: session.payment_intent,
        atualizado_em: new Date().toISOString(),
      }).eq('id', pagamento_id);

      if (agendamento_id) {
        const crypto = require('crypto');
        const qr_token = crypto.randomUUID();

        await supabase.from('agendamentos').update({
          status: 'CONFIRMADO',
          qr_token,
          atualizado_em: new Date().toISOString(),
        }).eq('id', agendamento_id);

        await supabase.from('status_log').insert([{
          agendamento_id,
          status_anterior: 'PENDENTE_PAGAMENTO',
          status_novo: 'CONFIRMADO',
          alterado_por: 'STRIPE_WEBHOOK',
        }]).then(() => {}).catch(() => {});

        const { data: ag } = await supabase
          .from('agendamentos')
          .select('cpf, nome, horario, data_consulta, tipo_consulta, meet_link, medicos(nome, especialidade)')
          .eq('id', agendamento_id)
          .single();

        if (ag?.cpf) {
          const { data: usuario } = await supabase
            .from('usuarios')
            .select('id, whatsapp')
            .eq('cpf', ag.cpf)
            .single();

          if (usuario?.id) {
            await supabase.from('notificacoes').insert([{
              usuario_id: usuario.id,
              titulo: '✅ Pagamento confirmado!',
              mensagem: 'Sua consulta está confirmada. Apresente o QR Code na recepção ou acesse a teleconsulta.',
              tipo: 'success',
              link: '/paciente/portal',
            }]);
          }

          if (usuario?.whatsapp) {
            const whatsapp = require('./whatsappService');
            whatsapp.notificarConfirmacao({
              whatsapp: usuario.whatsapp,
              nome: ag.nome,
              medico: ag.medicos?.nome || 'médico',
              data: ag.data_consulta,
              horario: ag.horario,
              tipo: ag.tipo_consulta,
              protocolo: '',
              meet_link: ag.meet_link,
            }).catch(e => console.error('[Stripe] WhatsApp confirmação:', e.message));
          }
        }
      }

      await registrarAuditoria({
        acao: 'PAGAMENTO_STRIPE_CONFIRMADO',
        entidade: 'pagamentos',
        entidade_id: pagamento_id,
        dados_novos: { stripe_session: session.id, agendamento_id },
      });

      console.log(`[Stripe] Pagamento ${pagamento_id} confirmado via checkout.session.completed`);
      break;
    }

    case 'payment_intent.payment_failed': {
      const intent = evento.data.object;
      const { data: pagamentos } = await supabase
        .from('pagamentos')
        .select('id')
        .eq('stripe_payment_intent', intent.id)
        .limit(1);

      if (pagamentos?.length) {
        await supabase.from('pagamentos').update({
          status: 'FALHOU',
          atualizado_em: new Date().toISOString(),
        }).eq('id', pagamentos[0].id);

        console.log(`[Stripe] Pagamento ${pagamentos[0].id} falhou — PaymentIntent: ${intent.id}`);
      }
      break;
    }

    case 'charge.refunded': {
      const charge = evento.data.object;
      const { data: pagamentos } = await supabase
        .from('pagamentos')
        .select('id')
        .eq('stripe_payment_intent', charge.payment_intent)
        .limit(1);

      if (pagamentos?.length) {
        await supabase.from('pagamentos').update({
          status: 'REEMBOLSADO',
          atualizado_em: new Date().toISOString(),
        }).eq('id', pagamentos[0].id);

        console.log(`[Stripe] Reembolso confirmado para pagamento ${pagamentos[0].id}`);
      }
      break;
    }

    default:
      console.log(`[Stripe Webhook] Evento ignorado: ${evento.type}`);
  }

  return { recebido: true, evento: evento.type };
}

async function criarReembolso(stripe_payment_intent, valor_centavos = null) {
  const stripe = obterStripe();
  if (!stripe) throw new Error('Stripe não configurado');

  const params = { payment_intent: stripe_payment_intent };
  if (valor_centavos) params.amount = valor_centavos;

  const reembolso = await stripe.refunds.create(params);
  console.log(`[Stripe] Reembolso criado: ${reembolso.id} — Status: ${reembolso.status}`);
  return reembolso;
}

async function buscarSession(session_id) {
  const stripe = obterStripe();
  if (!stripe) throw new Error('Stripe não configurado');
  return stripe.checkout.sessions.retrieve(session_id);
}

module.exports = {
  estaDisponivel,
  criarCheckoutSession,
  processarWebhookStripe,
  criarReembolso,
  buscarSession,
};
