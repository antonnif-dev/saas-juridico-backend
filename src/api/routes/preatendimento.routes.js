const express = require('express');
const router = express.Router();
const controller = require('../controllers/preatendimento.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');
const upload = multer();
const preatendimentoController = require('../controllers/preatendimento.controller');

router.get('/', authMiddleware(['administrador', 'advogado', 'cliente']), preatendimentoController.list);

// Rota Pública (para o formulário na Landing Page)
router.post('/', controller.create);
//router.post('/interno', authRequiredMiddleware, controller.create);

// Rotas Protegidas (Apenas Admin/Advogado)
router.delete('/:id', authMiddleware(['administrador', 'advogado']), controller.delete);
// Rotas de Fluxo de Trabalho
router.put('/:id/status', authMiddleware(['administrador', 'advogado']), controller.updateStatus);
router.put('/:id/proposal', authMiddleware(['administrador', 'advogado']), controller.updateProposal);
router.post('/:id/converter', authMiddleware(['administrador', 'advogado']), controller.convert);
router.post('/:id/accept', authMiddleware(['administrador', 'advogado']), controller.accept);
router.post('/:id/upload',
  authMiddleware(['administrador', 'advogado', 'cliente']),
  upload.single('documento'),
  controller.upload
);

// Movimentações do pré-atendimento
router.get(
  '/:id/movimentacoes',
  authMiddleware(['administrador', 'advogado', 'cliente']),
  controller.getMovimentacoes
);

router.post(
  '/:id/movimentacoes',
  authMiddleware(['administrador', 'advogado', 'cliente']),
  controller.addMovimentacao
);

module.exports = router;