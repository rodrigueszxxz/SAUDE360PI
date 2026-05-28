// Mock in-memory para substituir BullMQ sem Redis no ambiente local
const connection = require('../config/redis');

// Lógica de processamento do Worker
const processJob = async (name, data) => {
  console.log(`[Fila em Memória] Processando job: ${name}`);
  
  if (name === 'notificarProximo') {
    const { agendamentoCancelado } = data;
    // TODO: Implementar lógica real de buscar o próximo da fila e notificar
    console.log(`Buscando fila para notificar substituição do agendamento ${agendamentoCancelado?.id}`);
  }
};

const listasEsperaQueue = {
  add: async (name, data) => {
    console.log(`[Fila em Memória] Job adicionado: ${name}`);
    // Simula processamento assíncrono
    setTimeout(() => {
      processJob(name, data).catch(err => {
        console.error(`[Fila em Memória] Job falhou: ${name}`, err.message);
      });
    }, 100);
    return { id: Date.now().toString(), name, data };
  }
};

module.exports = {
  listasEsperaQueue
};
