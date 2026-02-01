const express = require('express');
const { z } = require('zod');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const clientController = require('../controllers/client.controller');

const router = express.Router();

const createClientSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'O nome é obrigatório.' }).min(3, 'O nome deve ter no mínimo 3 caracteres.'),
    email: z.string({ required_error: 'O e-mail é obrigatório.' }).email({ message: 'Formato de e-mail inválido.' }),
    password: z.string({ required_error: 'A senha é obrigatória.' }).min(6, 'A senha deve ter no mínimo 6 caracteres.'),
    phone: z.string().optional(),
    type: z.enum(['PF', 'PJ'], { errorMap: () => ({ message: 'O tipo deve ser PF ou PJ.' }) })
  })
});
router.get('/me', authMiddleware(), clientController.me);
router.put('/me', authMiddleware(['cliente']), clientController.updateMe);
router.post('/',
  authMiddleware(['administrador', 'advogado']),
  validate(createClientSchema),
  clientController.create
);

router.get('/', authMiddleware(), clientController.listAll);

router.get('/:id', authMiddleware(), clientController.getById);
router.put('/:id', authMiddleware(['administrador', 'advogado']), clientController.updateMe);
router.delete('/:id', authMiddleware(['administrador']), clientController.delete);

router.get('/me',
  authMiddleware(['cliente']),
  clientController.getMe
);

router.get('/by-auth/:authUid',
  authMiddleware(['administrador', 'advogado']),
  clientController.getByAuthUid
);

module.exports = router;