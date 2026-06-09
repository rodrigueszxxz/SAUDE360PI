require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const rateLimit    = require('express-rate-limit');
const cookieParser = require('cookie-parser');

const { autenticar, exigirPapel, apenasPropriosDados } = require('./middlewares/autenticacao');
const { auditarAcao } = require('./middlewares/auditoria');
const sanitizarInput = require('./middlewares/sanitizarInput');

const authRoutes            = require('./routes/authRoutes');
const medicoRoutes          = require('./routes/medicoRoutes');
const agendamentoRoutes     = require('./routes/agendamentoRoutes');
const pagamentoRoutes       = require('./routes/pagamentoRoutes');
const agendaRoutes          = require('./routes/agendaRoutes');
const triagemRoutes         = require('./routes/triagemRoutes');
const retornoRoutes         = require('./routes/retornoRoutes');
const pacienteRoutes        = require('./routes/pacienteRoutes');
const listaEsperaRoutes     = require('./routes/listaEsperaRoutes');
const notificacoesRoutes    = require('./routes/notificacoesRoutes');
const prontuarioRoutes      = require('./routes/prontuarioRoutes');
const adminRoutes           = require('./routes/adminRoutes');
const disponibilidadeRoutes = require('./routes/disponibilidadeRoutes');
const chatbotRoutes         = require('./routes/chatbotRoutes');

const { verificarExpirados } = require('./services/pagamentoService');
const { verificarNoShows   } = require('./services/noShowService');
const { verificarLembretes } = require('./services/notificacaoService');

const pagamentoController = require('./controllers/pagamentoController');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'same-site' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'"],
      imgSrc:     ["'self'", "data:", "https:"],
    },
  },
}));

const DEFAULT_DEV_ORIGINS = ['http://localhost:5173', 'http://localhost:8080', 'http://localhost:8081'];
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : DEFAULT_DEV_ORIGINS;

app.use(cors({
  origin: (origin, cb) => {
    // Permite qualquer origem local/dev ou origens autorizadas via .env
    if (process.env.NODE_ENV !== 'production') return cb(null, true);
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS: origin '${origin}' não autorizada`), false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_GERAL) || 200,
  message: { erro: 'Muitas requisições. Tente em alguns minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? (Number(process.env.RATE_LIMIT_AUTH) || 10) : 1000,
  message: { erro: 'Muitas tentativas de login. Tente em 15 minutos.' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
});

const agendamentoLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_AGENDAMENTO) || 30,
  message: { erro: 'Limite de agendamentos excedido. Tente em 1 hora.' },
});

app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
// Sanitiza todos os inputs: previne prototype pollution e trunca payloads absurdos
app.use(sanitizarInput);

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  version: '2.1.0',
  timestamp: new Date().toISOString(),
  ambiente: process.env.NODE_ENV || 'development',
}));

app.use('/auth', authLimiter, authRoutes);

app.use('/medicos', medicoRoutes);

app.use('/agendamento', autenticar, exigirPapel('paciente', 'medico', 'admin', 'recepcionista'), agendamentoLimiter, agendamentoRoutes);

app.post('/pagamentos/webhook', pagamentoController.webhookInterno);

app.use('/pagamentos', autenticar, exigirPapel('paciente', 'admin'), pagamentoRoutes);

app.use('/lista-espera', autenticar, exigirPapel('paciente', 'admin', 'recepcionista'), listaEsperaRoutes);

app.use('/agenda', autenticar, exigirPapel('medico', 'admin', 'recepcionista'), agendaRoutes);

app.use('/triagem', autenticar, exigirPapel('medico', 'admin', 'recepcionista'), triagemRoutes);

app.use('/retorno', autenticar, exigirPapel('medico', 'admin', 'recepcionista'), retornoRoutes);

app.use('/paciente', autenticar, apenasPropriosDados, pacienteRoutes);

app.use('/notificacoes', autenticar, notificacoesRoutes);

app.use('/prontuario', autenticar, prontuarioRoutes);

app.use('/admin', autenticar, adminRoutes);

app.use('/disponibilidade', disponibilidadeRoutes);

app.use('/chatbot', chatbotRoutes);

app.use((err, req, res, _next) => {
  if (err.message?.includes('CORS')) {
    return res.status(403).json({ erro: 'Origem não autorizada' });
  }
  console.error('[ERRO]', req.method, req.path, err.message);
  res.status(500).json({ erro: 'Erro interno do servidor' });
});

setInterval(() => {
  verificarExpirados().catch(e => console.error('[job] expirados:', e.message));
  verificarNoShows().catch(e => console.error('[job] no-show:', e.message));
  verificarLembretes().catch(e => console.error('[job] lembretes:', e.message));
}, 60_000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Servidor: http://localhost:${PORT}`);
  console.log(`🔒 CORS:    ${ALLOWED_ORIGINS.join(', ')}`);
  console.log(`🔑 Auth:    JWT access (15min) + httpOnly refresh (7d)`);
  console.log(`👥 Papéis:  paciente | medico | admin | recepcionista`);
});
