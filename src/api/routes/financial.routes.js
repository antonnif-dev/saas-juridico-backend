const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/transactions', authMiddleware(['administrador', 'advogado', 'cliente']), financialController.list);

router.post('/transactions', authMiddleware(['administrador', 'advogado']), financialController.create);

router.patch('/transactions/:id/status', authMiddleware(['administrador', 'advogado']), financialController.updateStatus);

router.patch('/transactions/:id/pay', authMiddleware(['administrador', 'advogado']), financialController.payTransaction);

module.exports = router;