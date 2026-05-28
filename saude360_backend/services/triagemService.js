const triagemRepository = require('../repositories/triagemRepository');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

async function responderTriagem(agendamento_id, respostas) {
  if (!agendamento_id) throw new Error('agendamento_id é obrigatório');
  if (!respostas || !Array.isArray(respostas) || respostas.length === 0) {
    throw new Error('Respostas são obrigatórias e devem ser um array');
  }

  const triagem = await triagemRepository.responder(agendamento_id, respostas);

  gerarResumoIA(agendamento_id, respostas).catch(err =>
    console.error('Erro ao gerar resumo IA:', err.message)
  );

  return triagem;
}

async function gerarResumoIA(agendamento_id, respostas) {
  try {
    const textoRespostas = respostas
      .map(r => `- ${r.pergunta || r.id}: ${r.resposta || '(não respondido)'}`)
      .join('\n');

    let resumo;

    if (OPENAI_API_KEY) {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente clínico. Gere um resumo objetivo e estruturado das respostas de triagem do paciente para o médico. 
Seja conciso (máximo 150 palavras). Destaque: queixa principal, duração, intensidade de dor (se mencionada), alergias e medicamentos em uso.
IMPORTANTE: Esse resumo é apenas um auxílio — não substitui a anamnese formal.`
            },
            {
              role: 'user',
              content: `Respostas da triagem pré-consulta:\n${textoRespostas}`
            }
          ],
          max_tokens: 250,
          temperature: 0.3,
        }),
      });

      const json = await response.json();
      resumo = json.choices?.[0]?.message?.content || gerarResumoSimples(respostas);
    } else {
      resumo = gerarResumoSimples(respostas);
    }

    await triagemRepository.salvarResumoIA(agendamento_id, resumo);
    return resumo;
  } catch (err) {
    const resumo = gerarResumoSimples(respostas);
    await triagemRepository.salvarResumoIA(agendamento_id, resumo);
    return resumo;
  }
}

function gerarResumoSimples(respostas) {
  const r = {};
  respostas.forEach(item => {
    if (item.id === 1) r.motivo  = item.resposta;
    if (item.id === 2) r.duracao = item.resposta;
    if (item.id === 3) r.dor     = item.resposta;
    if (item.id === 4) r.alergia = item.resposta;
    if (item.id === 5) r.medicamentos = item.resposta;
  });

  return [
    r.motivo      ? `Queixa principal: ${r.motivo}.`                       : null,
    r.duracao     ? `Duração dos sintomas: ${r.duracao}.`                  : null,
    r.dor         ? `Dor: ${r.dor}.`                                       : null,
    r.alergia     ? `Alergias medicamentosas: ${r.alergia}.`               : null,
    r.medicamentos ? `Medicamentos em uso: ${r.medicamentos}.`             : null,
    '\n⚠️ Este resumo não substitui a anamnese formal realizada pelo médico.',
  ].filter(Boolean).join(' ');
}

async function buscarResumo(agendamento_id) {
  const triagem = await triagemRepository.buscarPorAgendamento(agendamento_id);
  if (!triagem) throw new Error('Triagem não encontrada para este agendamento');
  return {
    ...triagem,
    disclaimer: '⚠️ Este resumo não substitui a anamnese formal realizada pelo médico.',
  };
}

module.exports = { responderTriagem, buscarResumo, gerarResumoIA };
