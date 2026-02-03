const express = require('express');
const router = express.Router();
const controller = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware(['administrador', 'advogado']));

router.post('/triagem', controller.analyzeTriagem);
router.post('/draft', controller.generateDraft);
router.post('/report', controller.generateReport);

router.post('/atendimento/executar', controller.executarAtendimento);

module.exports = router;