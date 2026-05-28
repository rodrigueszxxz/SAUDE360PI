require('dotenv').config();
const pagamentoService = require('./services/pagamentoService');

async function run() {
  try {
    console.log("Tentando criar PIX...");
    const pix = await pagamentoService.criarPix(
      "Teste",
      "12345678901",
      60,
      null,
      "Unimed",
      "123",
      "Teste",
      "2027-12-01"
    );
    console.log("PIX gerado:", pix);

    console.log("Tentando confirmar...");
    const confirmado = await pagamentoService.confirmarPagamento(pix.id);
    console.log("Confirmado:", confirmado);
  } catch(e) {
    console.error("ERRO:", e);
  }
}

run();
