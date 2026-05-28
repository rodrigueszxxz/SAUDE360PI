const PDFDocument = require('pdfkit');

function gerarReciboPDF(pagamento, paciente) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      let buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      // Cabeçalho
      doc.fontSize(20).text('Recibo de Pagamento - Saúde 360', { align: 'center' });
      doc.moveDown();
      
      // Detalhes da Clínica
      doc.fontSize(12).text('Clínica Saúde 360 Ltda.');
      doc.text('CNPJ: 00.000.000/0001-00');
      doc.text('Rua Exemplo, 123 - Centro, Fortaleza/CE');
      doc.moveDown(2);

      // Detalhes do Pagamento
      doc.fontSize(14).text('Detalhes do Recibo', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Nº do Recibo: ${pagamento.id.toString().padStart(6, '0')}`);
      doc.text(`Data: ${new Date(pagamento.criado_em).toLocaleDateString('pt-BR')}`);
      doc.text(`Valor: R$ ${Number(pagamento.valor).toFixed(2).replace('.', ',')}`);
      doc.text(`Status: ${pagamento.status}`);
      doc.moveDown();

      // Detalhes do Paciente
      doc.fontSize(14).text('Dados do Paciente', { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(`Nome: ${paciente.nome || pagamento.nome}`);
      doc.text(`CPF: ${paciente.cpf || pagamento.cpf}`);
      doc.moveDown(2);

      doc.fontSize(10).fillColor('gray').text('Este documento tem validade como recibo de prestação de serviços de saúde, não sendo válido como Nota Fiscal.', { align: 'center' });
      
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = { gerarReciboPDF };
