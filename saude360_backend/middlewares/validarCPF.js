function limparCPF(cpf) {
  return cpf.replace(/[.\-\s]/g, '');
}

function calcularDigito(cpf, peso) {
  let soma = 0;
  for (let i = 0; i < peso - 1; i++) {
    soma += parseInt(cpf[i]) * (peso - i);
  }
  const resto = (soma * 10) % 11;
  return resto === 10 || resto === 11 ? 0 : resto;
}

function cpfValido(cpf) {
  if (cpf.length !== 11) return false;
  if (!/^\d{11}$/.test(cpf)) return false;
  // Rejeita sequências iguais (ex: 11111111111)
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  // Valida dígitos verificadores
  const d1 = calcularDigito(cpf, 10);
  const d2 = calcularDigito(cpf, 11);
  return parseInt(cpf[9]) === d1 && parseInt(cpf[10]) === d2;
}

function validarCPF(req, res, next) {
  const { cpf } = req.body;

  if (!cpf) {
    return res.status(400).json({ erro: 'CPF é obrigatório' });
  }

  const cpfLimpo = limparCPF(String(cpf));

  if (!cpfValido(cpfLimpo)) {
    return res.status(400).json({ erro: 'CPF inválido' });
  }

  req.body.cpf = cpfLimpo;
  next();
}

module.exports = validarCPF;
