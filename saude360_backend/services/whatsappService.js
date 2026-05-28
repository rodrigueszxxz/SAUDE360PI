/**
 * whatsappService.js — Saúde 360
 * Integração com Twilio para envio de mensagens WhatsApp.
 *
 * Configuração:
 *  1. Crie uma conta em https://twilio.com
 *  2. Ative o Twilio Sandbox para WhatsApp (grátis para testes)
 *  3. Configure as variáveis no .env:
 *     TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 *
 * Produção:
 *  - Solicite número aprovado pelo WhatsApp Business API via Twilio
 *  - O número de sandbox (padrão: whatsapp:+14155238886) é apenas para testes
 *
 * Fallback:
 *  - Se Twilio não estiver configurado, loga a mensagem e retorna sucesso fictício
 *    para não quebrar o fluxo da aplicação.
 */

let client = null;
let twilioDisponivel = false;

// Inicialização lazy — não quebra se variáveis não estiverem configuradas
function inicializarTwilio() {
  if (client !== null) return; // já inicializado

  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token || sid === 'SEU_TWILIO_ACCOUNT_SID') {
    console.warn('[WhatsApp] Twilio não configurado — mensagens serão logadas localmente.');
    twilioDisponivel = false;
    return;
  }

  try {
    const twilio = require('twilio');
    client = twilio(sid, token);
    twilioDisponivel = true;
    console.log('✅ Twilio WhatsApp inicializado.');
  } catch (err) {
    console.warn('[WhatsApp] Falha ao inicializar Twilio:', err.message);
    twilioDisponivel = false;
  }
}

const FROM = () => process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886';

/**
 * Normaliza número de telefone para formato WhatsApp do Twilio.
 * Entrada: "85999887766" ou "+5585999887766" ou "(85) 99988-7766"
 * Saída:   "whatsapp:+5585999887766"
 */
function normalizarNumero(numero) {
  if (!numero) return null;

  // Remove tudo que não for dígito ou "+"
  let n = String(numero).replace(/[^\d+]/g, '');

  // Se já começa com +, assume formatado
  if (n.startsWith('+')) {
    return `whatsapp:${n}`;
  }

  // Se começa com 55 (DDI Brasil) e tem 12+ dígitos
  if (n.startsWith('55') && n.length >= 12) {
    return `whatsapp:+${n}`;
  }

  // Assume Brasil — adiciona +55
  return `whatsapp:+55${n}`;
}

async function enviarMensagem(numero, mensagem) {
  inicializarTwilio();

  const to = normalizarNumero(numero);
  if (!to) {
    console.warn('[WhatsApp] Número inválido:', numero);
    return { sucesso: false, erro: 'Número inválido' };
  }

  if (!twilioDisponivel) {
    // Modo dev: apenas loga
    console.log(`[WhatsApp DEV] Para: ${to}`);
    console.log(`[WhatsApp DEV] Mensagem: ${mensagem}`);
    return { sucesso: true, sid: `DEV-${Date.now()}`, modo: 'simulado' };
  }

  try {
    const msg = await client.messages.create({
      from: FROM(),
      to,
      body: mensagem,
    });

    console.log(`[WhatsApp] Enviado para ${to} — SID: ${msg.sid}`);
    return { sucesso: true, sid: msg.sid };
  } catch (err) {
    console.error(`[WhatsApp] Falha ao enviar para ${to}:`, err.message);
    return { sucesso: false, erro: err.message };
  }
}

async function notificarConfirmacao({ whatsapp, nome, medico, data, horario, tipo, protocolo, meet_link }) {
  if (!whatsapp) return;

  const dataStr   = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const tipoLabel = tipo === 'TELECONSULTA' ? '🖥️ Teleconsulta (vídeo)' : '🏥 Presencial';
  const linkMeet  = tipo === 'TELECONSULTA' && meet_link
    ? `\n\n🔗 *Link da consulta:* ${meet_link}`
    : '';

  const mensagem =
    `✅ *Consulta Confirmada — Saúde360*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `Sua consulta foi confirmada:\n` +
    `👨‍⚕️ Médico: ${medico}\n` +
    `📅 Data: ${dataStr}\n` +
    `⏰ Horário: ${horario}\n` +
    `📋 Tipo: ${tipoLabel}\n` +
    `🔑 Protocolo: ${protocolo}` +
    linkMeet +
    `\n\nAté lá! 😊`;

  return enviarMensagem(whatsapp, mensagem);
}

async function notificarLembrete24h({ whatsapp, nome, medico, data, horario, tipo, meet_link }) {
  if (!whatsapp) return;

  const dataStr  = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const instrucao = tipo === 'TELECONSULTA'
    ? '💡 Certifique-se de ter câmera e microfone funcionando.'
    : '💡 Chegue com 15 minutos de antecedência e traga seus documentos.';
  const linkMeet = tipo === 'TELECONSULTA' && meet_link
    ? `\n🔗 Link: ${meet_link}`
    : '';

  const mensagem =
    `⏰ *Lembrete de Consulta — Saúde360*\n\n` +
    `Olá, *${nome}*! Sua consulta é *amanhã*.\n\n` +
    `👨‍⚕️ Médico: ${medico}\n` +
    `📅 Data: ${dataStr}\n` +
    `⏰ Horário: ${horario}` +
    linkMeet +
    `\n\n${instrucao}`;

  return enviarMensagem(whatsapp, mensagem);
}

async function notificarCancelamento({ whatsapp, nome, data, horario, motivo }) {
  if (!whatsapp) return;

  const dataStr = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';
  const motivoStr = motivo ? `\n📝 Motivo: ${motivo}` : '';

  const mensagem =
    `❌ *Consulta Cancelada — Saúde360*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `Sua consulta${data ? ` de ${dataStr} às ${horario}` : ''} foi cancelada.` +
    motivoStr +
    `\n\nAcesse o portal para reagendar: https://saude360.com.br\n\n` +
    `Qualquer dúvida, entre em contato conosco. 🙏`;

  return enviarMensagem(whatsapp, mensagem);
}

async function notificarVagaDisponivel({ whatsapp, nome, medico, data, horario }) {
  if (!whatsapp) return;

  const dataStr = data ? new Date(data + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  const mensagem =
    `🎉 *Vaga Disponível — Saúde360*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `Uma vaga abriu para você na lista de espera:\n\n` +
    `👨‍⚕️ Médico: ${medico}\n` +
    `📅 Data: ${dataStr}\n` +
    `⏰ Horário: ${horario}\n\n` +
    `⚡ *Acesse agora para garantir seu horário:*\n` +
    `https://saude360.com.br\n\n` +
    `_Esta vaga expira em 2 horas._`;

  return enviarMensagem(whatsapp, mensagem);
}

async function notificarRecuperacaoSenha({ whatsapp, nome, token }) {
  if (!whatsapp) return;

  const mensagem =
    `🔐 *Recuperação de Senha — Saúde360*\n\n` +
    `Olá, *${nome}*!\n\n` +
    `Recebemos uma solicitação para redefinir sua senha.\n\n` +
    `Use este código: *${token}*\n\n` +
    `⚠️ Válido por 1 hora. Não compartilhe com ninguém.\n\n` +
    `Se não foi você, ignore esta mensagem.`;

  return enviarMensagem(whatsapp, mensagem);
}

async function notificarCheckin({ whatsapp, nome, medico, posicao }) {
  if (!whatsapp) return;

  const mensagem =
    `✅ *Check-in Confirmado — Saúde360*\n\n` +
    `Olá, *${nome}*! Seu check-in foi realizado.\n\n` +
    `👨‍⚕️ Médico: ${medico}\n` +
    `📍 Você está na posição *${posicao}* da fila.\n\n` +
    `Aguarde ser chamado(a). 😊`;

  return enviarMensagem(whatsapp, mensagem);
}

module.exports = {
  enviarMensagem,
  notificarConfirmacao,
  notificarLembrete24h,
  notificarCancelamento,
  notificarVagaDisponivel,
  notificarRecuperacaoSenha,
  notificarCheckin,
};
