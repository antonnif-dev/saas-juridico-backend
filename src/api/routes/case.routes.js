const express = require('express');
const { z } = require('zod');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const caseController = require('../controllers/case.controller');

const router = express.Router();

const createCaseSchema = z.object({
  body: z.object({
    numeroProcesso: z.string({ required_error: 'O número do processo é obrigatório.' }).min(1, 'O número do processo não pode ser vazio.'),
    partesEnvolvidas: z.string().optional(),
    comarca: z.string().optional(),
    instancia: z.string().optional(),
    status: z.enum(['Em andamento', 'Suspenso', 'Arquivado'], { required_error: 'O status é obrigatório.' }),
    clientId: z.string({ required_error: 'O ID do cliente é obrigatório.' })
  })
});

const addMovimentacaoSchema = z.object({
  body: z.object({
    descricao: z.string({ required_error: 'A descrição é obrigatória.' }).min(1, 'A descrição não pode ser vazia.'),
  }),
  params: z.object({
    processoId: z.string({ required_error: 'O ID do processo é obrigatório.' }),
  }),
});

const updateMovimentacaoSchema = z.object({
  body: z.object({
    descricao: z.string().min(1),
  }),
});

router.use(authMiddleware());
router.post('/', authMiddleware(['administrador', 'advogado']), validate(createCaseSchema), caseController.create);
router.get('/:id', authMiddleware(['administrador', 'advogado', 'cliente']), caseController.getById);
router.get('/', caseController.list);
router.get('/:id', caseController.getById);
router.put('/:id', caseController.update);
router.delete('/:id', caseController.delete);

router.post(
  '/:id/documentos',
  upload.single('documento'),
  caseController.uploadDocument
);
router.post(
  '/:processoId/movimentacoes',
  authMiddleware(['administrador', 'advogado']),
  validate(addMovimentacaoSchema),
  caseController.addMovimentacao
);
router.get(
  '/:processoId/movimentacoes',
  authMiddleware(['administrador', 'advogado', 'cliente']),
  caseController.getAllMovimentacoes
);

router.put(
  '/:processoId/movimentacoes/:movimentacaoId',
  authMiddleware(['administrador', 'advogado']),
  validate(updateMovimentacaoSchema),
  caseController.updateMovimentacao
);

router.delete(
  '/:processoId/movimentacoes/:movimentacaoId',
  authMiddleware(['administrador', 'advogado']),
  caseController.deleteMovimentacao
);

router.post(
  '/:id/documentos',
  authMiddleware(['administrador', 'advogado']),
  upload.single('documento'),
  caseController.uploadDocument
);

router.get(
  '/:id/documentos/:docId',
  authMiddleware(['administrador', 'advogado', 'cliente']),
  caseController.downloadDocument
);


module.exports = router;