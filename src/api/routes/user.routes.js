const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { z } = require('zod');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['advogado', 'estagiario', 'secretaria', 'administrador'], {
      errorMap: () => ({ message: 'O perfil fornecido é inválido.' })
    })
  })
});

const createAdvogadoSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'O nome é obrigatório.' }).min(3),
    email: z.string({ required_error: 'O e-mail é obrigatório.' }).email(),
    password: z.string({ required_error: 'A senha é obrigatória.' }).min(6, 'A senha deve ter no mínimo 6 caracteres.'),
  })
});

const updateAdvogadoSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
  })
});

const updateSelfSchema = z.object({
  body: z.object({
    name: z.string().min(3).optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
  })
});

router.patch(
  '/:uid/role',
  authMiddleware(['administrador']),
  validate(updateRoleSchema),
  userController.updateRole
);

router.get(
  '/me',
  authMiddleware(),
  userController.getMe
);

router.post(
  '/advogado',
  authMiddleware(['administrador']),
  validate(createAdvogadoSchema),
  userController.createAdvogado
);

router.get(
  '/advogados',
  authMiddleware(['administrador']),
  userController.listAdvogados
);

router.put(
  '/advogado/:id',
  authMiddleware(['administrador']),
  validate(updateAdvogadoSchema),
  userController.updateAdvogado
);

router.delete(
  '/advogado/:id',
  authMiddleware(['administrador']),
  userController.deleteAdvogado
);

router.put(
  '/me',
  authMiddleware(),
  validate(updateSelfSchema),
  userController.updateMe
);

router.post(
  '/me/photo',
  authMiddleware(),
  upload.single('photo'),
  userController.uploadPhoto
);

module.exports = router;