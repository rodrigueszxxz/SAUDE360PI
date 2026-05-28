const express  = require('express');
const bcrypt   = require('bcrypt');
const jwt      = require('jsonwebtoken');
const crypto   = require('crypto');
const { body, validationResult } = require('express-validator');
const supabase = require('../config/db');

const router = express.Router();

const SALT_ROUNDS  = 12;
const ACCESS_EXPIRES  = '15m';
const REFRESH_EXPIRES = '7d';
const REFRESH_MS      = 7 * 24 * 60 * 60 * 1000;

function gerarAccessToken(u) {
  return jwt.sign(
    { sub: u.id, email: u.email, papel: u.papel, nome: u.nome, cpf: u.cpf || null, crm: u.crm || null },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}
function gerarRefreshToken(id) {
  return jwt.sign({ sub: id }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });
}
function setRefreshCookie(res, token) {
  res.cookie('refresh_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: REFRESH_MS,
    path: '/auth',
  });
}
function limparRefreshCookie(res) {
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/auth',
  });
}
function formatarUsuario(u) {
  const b = { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
  if (u.cpf) b.cpf = u.cpf;
  if (u.crm) b.crm = u.crm;
  if (u.foto_perfil) b.avatar = u.foto_perfil;
  return b;
}

const validarRegistro = [
  body('nome').trim().isLength({ min: 3, max: 100 }),
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 8, max: 72 }),
  body('cpf').matches(/^\d{11}$/),
  body('whatsapp').optional().isMobilePhone('pt-BR'),
];
const validarLogin = [
  body('email').isEmail().normalizeEmail(),
  body('senha').isLength({ min: 1, max: 72 }),
];

router.post('/registro', validarRegistro, async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(400).json({ erro: 'Dados inválidos' });
  const { nome, email, senha, cpf, whatsapp } = req.body;
  try {
    const { data: existe } = await supabase
      .from('usuarios')
      .select('id')
      .or(`email.eq.${email},cpf.eq.${cpf}`)
      .limit(1);
    if (existe && existe.length > 0) return res.status(409).json({ erro: 'E-mail ou CPF já cadastrado' });

    const senha_hash = await bcrypt.hash(senha, SALT_ROUNDS);
    const { data: usuario, error } = await supabase
      .from('usuarios')
      .insert([{ nome, email, senha_hash, cpf, whatsapp: whatsapp || null, papel: 'paciente', ativo: true }])
      .select('id, nome, email, cpf, papel')
      .single();
    if (error) throw new Error(error.message);

    const token = gerarAccessToken(usuario);
    setRefreshCookie(res, gerarRefreshToken(usuario.id));
    return res.status(201).json({ usuario: formatarUsuario(usuario), token });
  } catch (err) {
    console.error('[registro]', err.message);
    return res.status(500).json({ erro: 'Erro ao criar conta' });
  }
});

router.post('/login', validarLogin, async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.status(401).json({ erro: 'Credenciais inválidas' });
  const { email, senha } = req.body;
  try {
    const { data: rows } = await supabase
      .from('usuarios')
      .select('id, nome, email, senha_hash, cpf, crm, papel, ativo, foto_perfil')
      .eq('email', email)
      .limit(1);
    const usuario = rows && rows[0];
    const hash = usuario ? usuario.senha_hash : '$2b$12$invalidhashtopreventtimingattacks000000000000';
    const ok = await bcrypt.compare(senha, hash);
    if (!usuario || !ok || !usuario.ativo) {
      return res.status(401).json({ erro: 'E-mail ou senha incorretos' });
    }
    setRefreshCookie(res, gerarRefreshToken(usuario.id));
    return res.json({ usuario: formatarUsuario(usuario), token: gerarAccessToken(usuario) });
  } catch (err) {
    console.error('[login]', err.message);
    return res.status(500).json({ erro: 'Erro ao autenticar' });
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) return res.status(401).json({ erro: 'Sem token de refresh' });
  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const { data: rows } = await supabase
      .from('usuarios')
      .select('id, nome, email, cpf, crm, papel, ativo, foto_perfil')
      .eq('id', payload.sub)
      .limit(1);
    const usuario = rows && rows[0];
    if (!usuario || !usuario.ativo) {
      limparRefreshCookie(res);
      return res.status(401).json({ erro: 'Usuário não encontrado' });
    }
    setRefreshCookie(res, gerarRefreshToken(usuario.id));
    return res.json({ usuario: formatarUsuario(usuario), token: gerarAccessToken(usuario) });
  } catch {
    limparRefreshCookie(res);
    return res.status(401).json({ erro: 'Refresh token inválido' });
  }
});

router.post('/logout', (req, res) => {
  limparRefreshCookie(res);
  return res.json({ mensagem: 'Logout realizado' });
});

router.post(
  '/esqueci-senha',
  [body('email').isEmail().normalizeEmail()],
  async (req, res) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ erro: 'E-mail inválido' });
    const { email } = req.body;
    try {
      const { data: rows } = await supabase
        .from('usuarios')
        .select('id')
        .eq('email', email)
        .limit(1);
      // Responde igual mesmo se não encontrado (evita enumeração)
      if (!rows || rows.length === 0) {
        return res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expira_em = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1h
      await supabase.from('password_reset_tokens').upsert([
        { usuario_id: rows[0].id, token, expira_em, usado: false },
      ]);
      // Em produção: enviar e-mail com link /redefinir-senha?token=<token>
      console.log(`[esqueci-senha] token para ${email}: ${token}`);
      return res.json({ mensagem: 'Se o e-mail estiver cadastrado, você receberá as instruções.', debug_token: process.env.NODE_ENV !== 'production' ? token : undefined });
    } catch (err) {
      console.error('[esqueci-senha]', err.message);
      return res.status(500).json({ erro: 'Erro ao processar solicitação' });
    }
  }
);

router.post(
  '/redefinir-senha',
  [
    body('token').isLength({ min: 64, max: 64 }),
    body('nova_senha').isLength({ min: 8, max: 72 }),
  ],
  async (req, res) => {
    if (!validationResult(req).isEmpty()) return res.status(400).json({ erro: 'Dados inválidos' });
    const { token, nova_senha } = req.body;
    try {
      const { data: rows } = await supabase
        .from('password_reset_tokens')
        .select('usuario_id, expira_em, usado')
        .eq('token', token)
        .limit(1);
      const rec = rows && rows[0];
      if (!rec || rec.usado || new Date(rec.expira_em) < new Date()) {
        return res.status(400).json({ erro: 'Token inválido ou expirado' });
      }
      const senha_hash = await bcrypt.hash(nova_senha, SALT_ROUNDS);
      await supabase.from('usuarios').update({ senha_hash }).eq('id', rec.usuario_id);
      await supabase.from('password_reset_tokens').update({ usado: true }).eq('token', token);
      return res.json({ mensagem: 'Senha redefinida com sucesso. Faça login.' });
    } catch (err) {
      console.error('[redefinir-senha]', err.message);
      return res.status(500).json({ erro: 'Erro ao redefinir senha' });
    }
  }
);

module.exports = router;
