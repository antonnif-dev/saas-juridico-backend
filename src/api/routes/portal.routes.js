const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const portalController = require('../controllers/portal.controller');

// GET /api/portal/dashboard-summary
router.get(
  '/dashboard-summary',
  authMiddleware(['cliente']),
  portalController.getDashboardSummary
);

// GET /api/portal/meus-processos
router.get(
  '/meus-processos',
  authMiddleware(['cliente']), // A mesma segurança, só clientes podem acessar
  portalController.getMyCases
);

module.exports = router;