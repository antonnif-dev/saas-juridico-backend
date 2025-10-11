const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// GET /api/dashboard/summary
router.get(
  '/summary',
  authMiddleware(['administrador', 'advogado']),
  dashboardController.getSummary
);

module.exports = router;