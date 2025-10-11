require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const clientRoutes = require('./api/routes/client.routes');
const userRoutes = require('./api/routes/user.routes');
const caseRoutes = require('./api/routes/case.routes');
const agendaRoutes = require('./api/routes/agenda.routes');
const dashboardRoutes = require('./api/routes/dashboard.routes.js');
const portalRoutes = require('./api/routes/portal.routes');
const webhookRoutes = require('./api/routes/webhook.routes');

const app = express();
const corsOptions = {
  origin: 'http://localhost:5173', // A porta EXATA do seu frontend Vite
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos permitidos
  allowedHeaders: ['Content-Type', 'Authorization'], // Headers permitidos
};

app.use(cors(corsOptions));
app.use(helmet());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);
app.use(express.json());
app.use('/api/clients', clientRoutes);
app.use('/api/users', userRoutes);
app.use('/api/processo', (req, res, next) => {
  console.log(`--- Requisição recebida em /api/processo: ${req.method} ${req.url} ---`);
  next();
});
app.use('/api/processo', caseRoutes);
app.use('/api/agenda', agendaRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/portal', portalRoutes);
app.get('/', (req, res) => {
  res.status(200).send({ message: 'API do SaaS Jurídico no ar!' });
});

module.exports = app;