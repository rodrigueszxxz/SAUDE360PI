
const jwt = require('jsonwebtoken');

function autenticar(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Autenticação necessária' });
  }
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id:    payload.sub,
      email: payload.email,
      papel: payload.papel,
      nome:  payload.nome,
      cpf:   payload.cpf  || null,
      crm:   payload.crm  || null,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return res.status(401).json({ erro: 'Token expirado' });
    return res.status(401).json({ erro: 'Token inválido' });
  }
}

function exigirPapel(...papeis) {
  return (req, res, next) => {
    if (!req.usuario) return res.status(401).json({ erro: 'Autenticação necessária' });
    if (!papeis.includes(req.usuario.papel)) return res.status(403).json({ erro: 'Acesso não autorizado' });
    next();
  };
}

function apenasPropriosDados(req, res, next) {
  const { usuario } = req;
  if (!usuario) return res.status(401).json({ erro: 'Autenticação necessária' });
  if (['admin', 'medico', 'recepcionista'].includes(usuario.papel)) return next();
  const cpfRota = req.params.cpf;
  if (cpfRota && cpfRota !== usuario.cpf) {
    return res.status(403).json({ erro: 'Acesso não autorizado' });
  }
  next();
}

module.exports = { autenticar, exigirPapel, apenasPropriosDados };
