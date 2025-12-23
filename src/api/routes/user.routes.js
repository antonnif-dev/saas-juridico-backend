const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { z } = require('zod');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// --- ESQUEMAS DE VALIDAÇÃO (ZOD) ---

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

// Campos comuns para Self e Advogado
const profileFields = {
  name: z.string().min(3).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  cpfCnpj: z.string().optional(),
  phone: z.string().optional(),
  oab: z.string().optional(),
  dataNascimento: z.string().optional(),
  estadoCivil: z.string().optional(),
  tipoPessoa: z.string().optional(),
  endereco: z.object({
    cep: z.string().optional(),
    rua: z.string().optional(),
    numero: z.string().optional(),
    complemento: z.string().optional(),
    bairro: z.string().optional(),
    cidade: z.string().optional(),
    estado: z.string().optional(),
  }).optional(),
};

const updateAdvogadoSchema = z.object({ body: z.object(profileFields) });
const updateSelfSchema = z.object({ body: z.object(profileFields) });

// --- DEFINIÇÃO DAS ROTAS ---

// Gerenciamento de Perfil Próprio (Self)
router.get('/me', authMiddleware(), userController.getMe);
router.put('/me', authMiddleware(), validate(updateSelfSchema), userController.updateMe);
router.post('/me/photo', authMiddleware(), upload.single('photo'), userController.uploadPhoto);

// Gerenciamento de Advogados (Admin)
router.post('/advogado', authMiddleware(['administrador']), validate(createAdvogadoSchema), userController.createAdvogado);
router.get('/advogados', authMiddleware(['administrador']), userController.listAdvogados);
router.put('/advogado/:id', authMiddleware(['administrador']), validate(updateAdvogadoSchema), userController.updateAdvogado);
router.delete('/advogado/:id', authMiddleware(['administrador']), userController.deleteAdvogado);

// Perfil/Role
router.patch('/:uid/role', authMiddleware(['administrador']), validate(updateRoleSchema), userController.updateRole);

module.exports = router;