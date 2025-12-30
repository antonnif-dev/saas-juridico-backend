const express = require('express');
const router = express.Router();
const financialController = require('../controllers/financial.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Listagem e Resumo (Acesso: Admin, Advogado e Cliente)
// O Service garantirá que o cliente veja apenas suas próprias faturas
router.get('/transactions', authMiddleware(['administrador', 'advogado', 'cliente']), financialController.list);

// Criação de Lançamentos (Acesso: Apenas Staff)
router.post('/transactions', authMiddleware(['administrador', 'advogado']), financialController.create);

// Atualização de Status (Ex: Marcar como pago)
router.patch('/transactions/:id/status', authMiddleware(['administrador', 'advogado']), financialController.updateStatus);

module.exports = router;