const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const upload = require("../middlewares/upload.memory.middleware");

router.get('/transactions', authMiddleware(['administrador', 'advogado', 'cliente']), financialController.list);

router.post('/transactions', authMiddleware(['administrador', 'advogado']), financialController.create);

router.patch('/transactions/:id/status', authMiddleware(['administrador', 'advogado']), financialController.updateStatus);

router.patch('/transactions/:id/pay', authMiddleware(['administrador', 'advogado']), financialController.payTransaction);

router.post('/transactions/:id/pay', authMiddleware(['administrador', 'advogado']), financialController.payTransaction);

router.get('/transactions/process/:processoId', authMiddleware(['administrador', 'advogado']), financialController.listByProcess);

router.post("/transactions/:id/recibo", authMiddleware(["administrador", "advogado"]), upload.single("recibo"), financialController.uploadRecibo);

module.exports = router;