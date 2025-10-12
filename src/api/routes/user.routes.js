const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { z } = require('zod');

// Schema para validar o corpo da requisição de mudança de perfil
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

/**
 * Rota para atualizar o perfil de um usuário.
 * PATCH /api/users/:uid/role
 *
 * - Apenas usuários com o perfil 'administrador' podem acessar.
 * - O corpo da requisição deve conter o novo 'role'.
 */
router.patch(
  '/:uid/role',
  authMiddleware(['administrador']), // <-- SEGURANÇA MÁXIMA AQUI
  validate(updateRoleSchema),
  userController.updateRole
);

router.get(
  '/me',
  authMiddleware(), // Apenas requer que o usuário esteja logado, não importa o perfil
  userController.getMe
);

router.post(
  '/advogado',
  authMiddleware(['administrador']), // Protege a rota, permitindo acesso APENAS a administradores.
  validate(createAdvogadoSchema),
  userController.createAdvogado
);

module.exports = router;