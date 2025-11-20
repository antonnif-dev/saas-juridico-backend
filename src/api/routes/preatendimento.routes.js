const express = require('express');
const router = express.Router();
const controller = require('../controllers/preatendimento.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Rota Pública (para o formulário na Landing Page)
router.post('/', controller.create);

// Rotas Protegidas (Apenas Admin/Advogado)
router.get('/', authMiddleware(['administrador', 'advogado']), controller.list);
router.put('/:id/status', authMiddleware(['administrador', 'advogado']), controller.updateStatus);
router.post('/:id/converter', authMiddleware(['administrador', 'advogado']), controller.convert);
router.post('/:id/accept', authMiddleware(['administrador', 'advogado']), controller.accept);
router.delete('/:id', authMiddleware(['administrador', 'advogado']), controller.delete);

module.exports = router;