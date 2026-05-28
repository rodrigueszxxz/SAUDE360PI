/**
 * chatbotService.js — Saúde 360
 * Chatbot rule-based GRATUITO — sem OpenAI, sem Gemini, sem Claude.
 *
 * Estratégia:
 *  1. Matching por palavras-chave (intent detection)
 *  2. FAQ dinâmico via tabela chatbot_faq (banco de dados)
 *  3. Preparos de exames via tabela exames_preparos
 *  4. Similaridade textual simples (Jaccard similarity)
 *  5. Handoff para humano quando confiança < threshold
 *
 * Para usar IA local (opcional):
 *  - Instale Ollama: https://ollama.ai
 *  - Rode: ollama pull mistral
 *  - Configure: OLLAMA_URL=http://localhost:11434
 */
const supabase = require('../config/db');

const INTENTS = [
  {
    intent:   'AGENDAR',
    keywords: ['agendar', 'marcar', 'consulta', 'horário', 'disponível', 'agendamento', 'médico', 'appointment'],
    response: null,
    action:   'SUGGEST_SCHEDULE',
  },
  {
    intent:   'CANCELAR',
    keywords: ['cancelar', 'desmarcar', 'cancelamento', 'desmarcar consulta', 'remover agendamento'],
    response: 'Para cancelar sua consulta, acesse o Portal do Paciente > Minhas Consultas e clique em "Cancelar". Lembre-se que cancelamentos devem ser feitos com pelo menos 12 horas de antecedência para reembolso integral.',
    action:   null,
  },
  {
    intent:   'HORARIO_FUNCIONAMENTO',
    keywords: ['horário', 'funcionamento', 'aberto', 'abre', 'fecha', 'atendimento', 'quando', 'funciona'],
    response: 'Nossa clínica funciona de segunda a sexta-feira, das 07:00 às 19:00, e aos sábados das 08:00 às 12:00. O Pronto Atendimento funciona 24 horas!',
    action:   null,
  },
  {
    intent:   'DOR_CABECA',
    keywords: ['dor de cabeça', 'cefaleia', 'enxaqueca', 'cabeça doendo', 'cabeça dói'],
    response: '🧠 *Dor de cabeça — Orientações básicas:*\n\n' +
      '• Beba bastante água (desidratação é causa comum)\n' +
      '• Descanse em ambiente escuro e silencioso\n' +
      '• Analgésicos como *Paracetamol 750mg* ou *Dipirona 500mg* podem aliviar (1 comprimido a cada 6h, máximo 4x/dia)\n' +
      '• Evite automedicação prolongada\n\n' +
      '⚠️ *Procure atendimento urgente se:* dor súbita e muito forte, febre alta, rigidez no pescoço ou alterações na visão.\n\n' +
      '📅 Quer agendar uma consulta com um neurologista ou clínico geral? Posso te redirecionar!',
    action:   null,
  },
  {
    intent:   'FEBRE',
    keywords: ['febre', 'temperatura alta', 'febril', 'corpo quente', 'calafrio'],
    response: '🌡️ *Febre — Orientações básicas:*\n\n' +
      '• Febre é temperatura acima de *37,8°C*\n' +
      '• Use *Paracetamol 750mg* ou *Dipirona 500mg* a cada 6 horas\n' +
      '• Mantenha boa hidratação (água, sucos, chás)\n' +
      '• Use roupas leves e compressas mornas na testa\n\n' +
      '⚠️ *Procure atendimento urgente se:* febre acima de 39°C que não cede, febre há mais de 3 dias, manchas no corpo, confusão mental.\n\n' +
      '📅 Posso agendar uma consulta para você avaliar melhor!',
    action:   null,
  },
  {
    intent:   'GRIPE_RESFRIADO',
    keywords: ['gripe', 'resfriado', 'coriza', 'espirro', 'nariz entupido', 'garganta', 'dor de garganta', 'tosse'],
    response: '🤧 *Gripe e Resfriado — Orientações:*\n\n' +
      '• Repouso e hidratação são fundamentais\n' +
      '• Para dor e febre: *Paracetamol 750mg* a cada 6h\n' +
      '• Para nariz entupido: lavagem nasal com soro fisiológico\n' +
      '• Para dor de garganta: pastilhas ou gargarejo com água morna e sal\n' +
      '• Mel com limão ajuda a aliviar a tosse (adultos)\n\n' +
      '⚠️ *Procure atendimento se:* sintomas persistirem por mais de 7 dias, falta de ar, febre alta ou dor no peito.\n\n' +
      '📅 Quer agendar com um clínico geral? Posso te ajudar!',
    action:   null,
  },
  {
    intent:   'HORARIO_REMEDIO',
    keywords: ['remédio', 'medicamento', 'horário do remédio', 'como tomar', 'esqueci', 'dose', 'posologia', 'quantas horas', 'intervalo'],
    response: '💊 *Orientação sobre medicamentos:*\n\n' +
      '• *A cada 6 horas:* 6h, 12h, 18h, 0h (ex: Paracetamol, Dipirona)\n' +
      '• *A cada 8 horas:* 6h, 14h, 22h (ex: Amoxicilina, Ibuprofeno)\n' +
      '• *A cada 12 horas:* 8h e 20h (ex: Omeprazol, anti-hipertensivos)\n' +
      '• *1x ao dia:* sempre no mesmo horário (ex: anticoncepcional)\n\n' +
      '💡 *Dicas:*\n' +
      '• Coloque alarmes no celular para não esquecer\n' +
      '• Antibióticos: NUNCA pare antes de completar o tratamento\n' +
      '• Não tome em jejum se a bula orientar "após refeições"\n\n' +
      '⚠️ Para dúvidas específicas sobre *seu* medicamento, consulte seu médico.\n\n' +
      '📅 Quer agendar uma consulta de retorno? Posso te redirecionar!',
    action:   null,
  },
  {
    intent:   'PRESSAO',
    keywords: ['pressão', 'pressão alta', 'hipertensão', 'pressão baixa', 'hipotensão', 'tontura', 'tonto'],
    response: '❤️ *Pressão arterial — Orientações:*\n\n' +
      '• Pressão normal: *120/80 mmHg*\n' +
      '• Pressão alta (>140/90): reduza sal, faça exercícios leves, evite estresse\n' +
      '• Pressão baixa (<90/60): beba água, levante devagar, coma algo salgado\n' +
      '• Tonturas: sente-se imediatamente e beba água\n\n' +
      '⚠️ *Procure atendimento se:* pressão acima de 180/110, dor no peito, dificuldade para falar ou mover um lado do corpo.\n\n' +
      '📅 Agende uma consulta com um cardiologista para acompanhamento!',
    action:   null,
  },
  {
    intent:   'ALERGIA',
    keywords: ['alergia', 'alérgico', 'coceira', 'urticária', 'vermelhidão', 'inchaço', 'reação alérgica'],
    response: '🤧 *Alergia — Orientações:*\n\n' +
      '• Para coceiras leves: *Loratadina 10mg* 1x ao dia (não dá sono)\n' +
      '• Para crises: compressas frias ajudam no local\n' +
      '• Evite coçar — pode piorar e infeccionar\n' +
      '• Anote o que comeu ou usou antes dos sintomas\n\n' +
      '⚠️ *Procure URGENTE se:* inchaço nos lábios/língua/garganta, dificuldade para respirar, tontura súbita.\n\n' +
      '📅 Quer agendar com um dermatologista ou alergista?',
    action:   null,
  },
  {
    intent:   'DOR_ESTOMAGO',
    keywords: ['estômago', 'dor de estômago', 'azia', 'queimação', 'gastrite', 'refluxo', 'náusea', 'enjoo', 'vômito'],
    response: '🫄 *Dor de estômago — Orientações:*\n\n' +
      '• Para azia/queimação: *Omeprazol 20mg* em jejum (30min antes do café)\n' +
      '• Evite: café, álcool, frituras, alimentos ácidos\n' +
      '• Coma devagar e em porções menores\n' +
      '• Não deite logo após comer (espere 2h)\n' +
      '• Para enjoo: *Dramin* 1 comprimido (pode dar sono)\n\n' +
      '⚠️ *Procure atendimento se:* dor intensa, vômito com sangue, fezes escuras.\n\n' +
      '📅 Agende com um gastroenterologista para investigar melhor!',
    action:   null,
  },
  {
    intent:   'SINTOMAS_GERAIS',
    keywords: ['sintoma', 'dor', 'passando mal', 'doente', 'mal estar', 'indisposição', 'fraqueza', 'cansaço'],
    response: '🏥 *Orientação geral de saúde:*\n\n' +
      '• Descanse e mantenha-se hidratado\n' +
      '• Para dores leves: *Paracetamol 750mg* a cada 6h\n' +
      '• Monitore a temperatura (febre > 37,8°C)\n' +
      '• Alimente-se bem, mesmo sem apetite (sopas leves, frutas)\n\n' +
      '⚠️ *Procure atendimento URGENTE se:*\n' +
      '• Dor no peito ou falta de ar\n' +
      '• Febre alta que não cede\n' +
      '• Confusão mental\n' +
      '• Sangramento inesperado\n\n' +
      '📅 O ideal é sempre consultar um médico. Posso agendar uma consulta agora?',
    action:   null,
  },
  {
    intent:   'CONVENIO',
    keywords: ['convênio', 'plano', 'unimed', 'hapvida', 'bradesco', 'sulamerica', 'amil', 'porto seguro', 'particular', 'cobertura'],
    response: null,
    action:   'FAQ_LOOKUP',
  },
  {
    intent:   'RESULTADO_EXAME',
    keywords: ['resultado', 'exame', 'laudo', 'laboratorio', 'exames'],
    response: 'Os resultados de exames ficam disponíveis no Portal do Paciente em até 48 horas após a realização. Acesse Histórico > Exames.',
    action:   null,
  },
  {
    intent:   'PREPARO_EXAME',
    keywords: ['preparo', 'preparação', 'jejum', 'antes do exame', 'como me preparar', 'hemograma', 'ultrassom', 'endoscopia', 'colesterol', 'glicose', 'ecg'],
    response: null,
    action:   'EXAME_LOOKUP',
  },
  {
    intent:   'SENHA',
    keywords: ['senha', 'esqueci', 'redefinir', 'recuperar', 'trocar senha', 'login'],
    response: 'Para redefinir sua senha, clique em "Esqueci minha senha" na tela de login. Você receberá as instruções por email.',
    action:   null,
  },
  {
    intent:   'TELECONSULTA',
    keywords: ['teleconsulta', 'online', 'vídeo', 'meet', 'link', 'videochamada', 'consulta online', 'telemedicina'],
    response: 'A teleconsulta é realizada via Google Meet. Após confirmar o pagamento, o link ficará disponível na aba "Teleconsulta" do seu portal. O botão "Entrar na Consulta" fica ativo 15 minutos antes do horário agendado.',
    action:   null,
  },
  {
    intent:   'PAGAMENTO',
    keywords: ['pagamento', 'pagar', 'pix', 'valor', 'preço', 'quanto custa', 'taxa', 'custo', 'cobrado'],
    response: 'Aceitamos PIX e convênios médicos. O valor da consulta particular é de R$ 60,00. Com convênio, aplicamos desconto conforme o plano. O pagamento é feito online após agendar.',
    action:   null,
  },
  {
    intent:   'REEMBOLSO',
    keywords: ['reembolso', 'devolução', 'devolver', 'estorno', 'dinheiro de volta'],
    response: 'O reembolso é processado automaticamente em até 5 dias úteis para cancelamentos feitos com mais de 12 horas de antecedência. Para cancelamentos em cima da hora, o crédito fica retido.',
    action:   null,
  },
  {
    intent:   'FILA_ESPERA',
    keywords: ['fila', 'espera', 'lista de espera', 'próximo horário', 'lotado', 'cheio'],
    response: 'Você pode entrar na lista de espera ao tentar agendar um horário ocupado. Quando uma vaga abrir, você será notificado automaticamente.',
    action:   null,
  },
  {
    intent:   'HUMANO',
    keywords: ['atendente', 'humano', 'pessoa', 'falar com alguém', 'recepção', 'recepcionista', 'ajuda real'],
    response: null,
    action:   'HANDOFF_HUMAN',
  },
  {
    intent:   'SAUDACAO',
    keywords: ['oi', 'olá', 'bom dia', 'boa tarde', 'boa noite', 'hello', 'hey', 'tudo bem'],
    response: null,
    action:   'GREETING',
  },
  {
    intent:   'AGRADECIMENTO',
    keywords: ['obrigado', 'obrigada', 'valeu', 'thanks', 'thank you', 'grato', 'grata'],
    response: 'De nada! 😊 Se precisar de mais alguma coisa, estou aqui para ajudar. Lembre-se: você pode agendar uma consulta a qualquer momento pelo nosso portal! 📅',
    action:   null,
  },
];

function tokenizar(texto) {
  return new Set(
    texto.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2)
  );
}

function jaccardSimilarity(a, b) {
  const setA = tokenizar(a);
  const setB = tokenizar(b);
  const intersecao = new Set([...setA].filter(x => setB.has(x)));
  const uniao = new Set([...setA, ...setB]);
  return uniao.size === 0 ? 0 : intersecao.size / uniao.size;
}

function detectarIntencao(mensagem) {
  const textoNorm = mensagem.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  let melhorIntent = null;
  let melhorScore  = 0;

  for (const intent of INTENTS) {
    // Match por palavras-chave diretas
    const kwScore = intent.keywords.reduce((score, kw) => {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return textoNorm.includes(kwNorm) ? score + 1 : score;
    }, 0);

    const score = kwScore / intent.keywords.length;

    if (score > melhorScore) {
      melhorScore  = score;
      melhorIntent = intent;
    }
  }

  return { intent: melhorIntent, confianca: melhorScore };
}

async function buscarFAQ(mensagem) {
  const { data: faqs } = await supabase
    .from('chatbot_faq')
    .select('pergunta, resposta, palavras_chave')
    .eq('ativo', true);

  if (!faqs?.length) return null;

  let melhorResposta = null;
  let melhorScore    = 0;

  for (const faq of faqs) {
    // Score por palavras-chave do FAQ
    const kwScore = (faq.palavras_chave || []).reduce((acc, kw) => {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return mensagem.toLowerCase().includes(kwNorm) ? acc + 1 : acc;
    }, 0);

    // Score por similaridade com a pergunta
    const simScore = jaccardSimilarity(mensagem, faq.pergunta);

    const score = (kwScore * 0.6) + (simScore * 0.4);

    if (score > melhorScore && score > 0.1) {
      melhorScore    = score;
      melhorResposta = faq.resposta;
    }
  }

  return melhorResposta;
}

async function buscarPreparoExame(mensagem) {
  const { data: exames } = await supabase
    .from('exames_preparos')
    .select('nome_exame, preparo, palavras_chave')
    .eq('ativo', true);

  if (!exames?.length) return null;

  for (const exame of exames) {
    const hit = (exame.palavras_chave || []).some(kw => {
      const kwNorm = kw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return mensagem.toLowerCase().includes(kwNorm);
    });
    if (hit) {
      return `📋 *Preparo para ${exame.nome_exame}:*\n${exame.preparo}`;
    }
  }
  return null;
}

function respostaSaudacao(nome) {
  const hora = new Date().getHours();
  const periodo = hora < 12 ? 'bom dia' : hora < 18 ? 'boa tarde' : 'boa noite';
  const nomeStr = nome ? `, *${nome}*` : '';
  return (
    `Olá${nomeStr}! ${periodo} 😊\n\n` +
    `Sou o assistente virtual da *Saúde360*. Posso te ajudar com:\n\n` +
    `📅 Agendamentos e Cancelamentos\n` +
    `🕒 Horários de funcionamento\n` +
    `❓ Dúvidas sobre preparos e convênios\n` +
    `💊 Orientações básicas de saúde\n\n` +
    `Como posso ajudar você hoje?`
  );
}

async function consultarOllama(mensagem, contexto = '') {
  const ollamaUrl = process.env.OLLAMA_URL;
  if (!ollamaUrl) return null;

  try {
    const http = require('http');
    const body = JSON.stringify({
      model: process.env.OLLAMA_MODEL || 'mistral',
      prompt: `Você é um assistente de saúde da Saúde360. Responda em português de forma concisa e profissional.\n\nContexto: ${contexto}\n\nPergunta: ${mensagem}\n\nResposta:`,
      stream: false,
    });

    return await new Promise((resolve, reject) => {
      const req = http.request(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            resolve(json.response || null);
          } catch { resolve(null); }
        });
      });
      req.on('error', reject);
      req.setTimeout(10000, () => { req.destroy(); resolve(null); });
      req.write(body);
      req.end();
    });
  } catch (err) {
    console.warn('[chatbot] Ollama indisponível:', err.message);
    return null;
  }
}

/**
 * Processa mensagem do paciente e retorna resposta.
 *
 * @param {string} mensagem  - Mensagem do usuário
 * @param {string} [nome]    - Nome do paciente (para personalização)
 * @param {string} [contexto]- Histórico da conversa (para Ollama)
 * @returns {{ resposta: string, intent: string, acao: string|null, confianca: number }}
 */
async function processar(mensagem, nome = null, contexto = '') {
  if (!mensagem?.trim()) {
    return {
      resposta:  'Desculpe, não entendi. Pode reformular sua pergunta? 🤔',
      intent:    'DESCONHECIDO',
      acao:      null,
      confianca: 0,
    };
  }

  const { intent, confianca } = detectarIntencao(mensagem);

    if (intent?.action === 'GREETING') {
    return { resposta: respostaSaudacao(nome), intent: 'SAUDACAO', acao: null, confianca };
  }

    if (intent?.action === 'HANDOFF_HUMAN') {
    return {
      resposta:  '👩‍💼 Transferindo para um atendente humano...\n\nNosso horário de atendimento: segunda a sexta das 8h às 18h e sábados das 8h às 12h.\n\nAguarde um momento! ⏳',
      intent:    'HUMANO',
      acao:      'HANDOFF_HUMAN',
      confianca,
    };
  }

    if (intent?.action === 'EXAME_LOOKUP') {
    const preparo = await buscarPreparoExame(mensagem);
    if (preparo) {
      return { resposta: preparo, intent: 'PREPARO_EXAME', acao: null, confianca };
    }
  }

    if (intent?.action === 'SUGGEST_SCHEDULE') {
    return {
      resposta:  '📅 Para agendar uma consulta, acesse nossa vitrine de médicos e escolha o especialista ideal para você!\n\nVou te redirecionar agora. 😊',
      intent:    'AGENDAR',
      acao:      'REDIRECT_SCHEDULE',
      confianca,
    };
  }

    if (intent?.response && confianca > 0.15) {
    return { resposta: intent.response, intent: intent.intent, acao: null, confianca };
  }

    const faqResposta = await buscarFAQ(mensagem);
  if (faqResposta) {
    return { resposta: faqResposta, intent: 'FAQ', acao: null, confianca: 0.7 };
  }

    const ollamaResposta = await consultarOllama(mensagem, contexto);
  if (ollamaResposta) {
    return { resposta: ollamaResposta, intent: 'IA_LOCAL', acao: null, confianca: 0.6 };
  }

    return {
    resposta:
      'Ainda não consigo responder essa pergunta perfeitamente, mas estou aprendendo muito rápido! 🤖\n\n' +
      'Por enquanto, tente escolher uma das opções abaixo para eu te ajudar:\n' +
      '1️⃣ **Agendar Nova Consulta** (Digite "Agendar")\n' +
      '2️⃣ **Dúvidas sobre preparo de exames** (Digite "Exames")\n' +
      '3️⃣ **Horários de funcionamento** (Digite "Horario")\n' +
      '4️⃣ **Falar com um atendente humano** (Digite "Atendente")\n\n' +
      'Você também pode me perguntar sobre convênios ou primeiros socorros para sintomas comuns!',
    intent:    'FALLBACK',
    acao:      null,
    confianca: 0,
  };
}

async function salvarMensagem(usuario_id, role, mensagem) {
  try {
    await supabase.from('chatbot_historico').insert([{
      usuario_id,
      role,      // 'user' ou 'assistant'
      mensagem,
    }]);
  } catch { /* silencioso */ }
}

module.exports = { processar, salvarMensagem, detectarIntencao, buscarFAQ };
