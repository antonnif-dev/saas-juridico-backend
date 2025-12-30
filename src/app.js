require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Importação das Rotas
const clientRoutes = require('./api/routes/client.routes');
const userRoutes = require('./api/routes/user.routes');
const caseRoutes = require('./api/routes/case.routes');
const agendaRoutes = require('./api/routes/agenda.routes');
const dashboardRoutes = require('./api/routes/dashboard.routes.js');
const portalRoutes = require('./api/routes/portal.routes');
const webhookRoutes = require('./api/routes/webhook.routes');
const themeRoutes = require('./api/routes/theme.routes');
const messageRoutes = require('./api/routes/message.routes');
const preatendimentoRoutes = require('./api/routes/preatendimento.routes');
const financialRoutes = require('./api/routes/financial.routes');
const aiRoutes = require('./api/routes/ai.routes');
const notificationRoutes = require('./api/routes/notification.routes');

// Middleware de Autenticação
const authMiddleware = require('./api/middlewares/auth.middleware');

const app = express();
app.set('trust proxy', 1);

const corsOptions = {
  origin: ['http://localhost:5173', 'https://saas-juridico-frontend.vercel.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  trustProxy: 1,
});

app.use(limiter);
app.use(express.json());

// --- 1. ROTAS PÚBLICAS OU DE SISTEMA ---
app.get('/', (req, res) => {
  res.status(200).send({ message: 'API do SaaS Jurídico no ar!' });
});
app.use('/api/webhooks', webhookRoutes);
app.use('/api/theme', themeRoutes); // Tema é leitura pública para o Layout

// --- 2. ROTAS HÍBRIDAS (ACESSO: TODOS LOGADOS) ---
// Processos: Todos veem, mas o Service/Controller já protege a edição
app.use('/api/processo', authMiddleware(['administrador', 'advogado', 'cliente']), caseRoutes);
app.use('/api/mensagens', authMiddleware(['administrador', 'advogado', 'cliente']), messageRoutes);
app.use('/api/portal', authMiddleware(['administrador', 'advogado', 'cliente']), portalRoutes);
app.use('/api/financial', authMiddleware(['administrador', 'advogado', 'cliente']), financialRoutes);
app.use('/api/financial', financialRoutes);

// --- 3. ROTAS DE STAFF (ACESSO: ADMIN E ADVOGADO) ---
const staffOnly = authMiddleware(['administrador', 'advogado']);

app.use('/api/clients', staffOnly, clientRoutes);
app.use('/api/agenda', staffOnly, agendaRoutes);
app.use('/api/preatendimento', authMiddleware(['administrador', 'advogado', 'cliente']), preatendimentoRoutes);
app.use('/api/notifications', authMiddleware(['administrador', 'advogado', 'cliente']), notificationRoutes);
app.use('/api/dashboard', staffOnly, dashboardRoutes);
app.use('/api/ai', staffOnly, aiRoutes);

// --- 4. ROTAS EXCLUSIVAS (ACESSO: APENAS ADMINISTRADOR) ---
const adminOnly = authMiddleware(['administrador']);

app.use('/api/users', userRoutes);
app.use('/api/financial', authMiddleware(['administrador', 'cliente']), financialRoutes);


module.exports = app;