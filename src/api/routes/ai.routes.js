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

// Pós Atentimentos
router.post("/pos/sentenca/analisar", controller.posAnalisarSentenca);
router.post("/pos/cliente/tradutor", controller.posTradutorCliente);
router.post("/pos/cliente/relatorio", controller.posRelatorioMensal);
router.post("/pos/estrategia/viabilidade", controller.posEstrategiaRecursal);
router.post("/pos/estrategia/datajud", controller.posDatajudVisual);
router.post("/pos/redacao/recurso", controller.posMinutarRecurso);
router.post("/pos/pdf", controller.posPdf);

module.exports = router;