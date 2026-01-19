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
  authMiddleware(['cliente']),
  portalController.getMyCases
);

// GET /api/portal/processos/:id/detalhes
router.get(
  '/processos/:id/detalhes',
  authMiddleware(['cliente']),
  portalController.getMyCaseDetails
);

// GET /api/portal/advogados
router.get(
  '/advogados',
  authMiddleware(['cliente']),
  portalController.listLawyers
);

module.exports = router;