const express = require('express');
const router = express.Router();
const controller = require('../controllers/ai.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware(['administrador', 'advogado']));

// Pré Atentimentos
router.post('/triagem', controller.analyzeTriagem);
router.post('/draft', controller.generateDraft);
router.post('/report', controller.generateReport);

// Atendimentos
router.post('/atendimento/executar', controller.executarAtendimento);
router.post('/atendimento/whatsapp', controller.atendimentoWhatsApp);
router.post('/atendimento/pdf', controller.atendimentoPdf);
router.post('/atendimento/minuta/salvar', controller.salvarMinuta);
router.post('/atendimento/minuta/regenerar', controller.regenerarMinuta);
router.post('/atendimento/pdf', controller.baixarPdf);
router.post('/atendimento/exportar', controller.exportarZip);
router.post('/atendimento/exportar', controller.atendimentoExportar);

module.exports = router;