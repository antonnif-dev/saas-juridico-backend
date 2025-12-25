const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validator.middleware');
const { z } = require('zod');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// --- ESQUEMAS DE VALIDAÇÃO (ZOD) ---

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

const updateSelfSchema = z.object({ body: z.object(profileFields) });
const updateAdvogadoSchema = z.object({ body: z.object(profileFields) });

const createAdvogadoSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'O nome é obrigatório.' }).min(3),
    email: z.string({ required_error: 'O e-mail é obrigatório.' }).email(),
    password: z.string({ required_error: 'A senha é obrigatória.' }).min(6),
  })
});

const updateRoleSchema = z.object({
  body: z.object({
    role: z.enum(['advogado', 'estagiario', 'secretaria', 'administrador', 'cliente'])
  })
});

// --- DEFINIÇÃO DAS ROTAS ---

// 1. ROTAS DE PERFIL PRÓPRIO (Prioridade Máxima)
// Estas rotas devem vir ANTES de qualquer rota com parâmetros dinâmicos como /:id
router.get('/me', authMiddleware(['administrador', 'advogado', 'cliente']), userController.getMe);
router.put('/me', authMiddleware(['administrador', 'advogado', 'cliente']), validate(updateSelfSchema), userController.updateMe);
router.post('/me/photo', authMiddleware(['administrador', 'advogado', 'cliente']), upload.single('photo'), userController.uploadPhoto);

// 2. ROTAS DE GESTÃO DE EQUIPE (ADMIN)
// Padronizei para 'advogados' (plural) para evitar confusão com a role 'advogado' (singular)
router.get('/advogados', authMiddleware(['administrador']), userController.listAdvogados);
router.post('/advogados', authMiddleware(['administrador']), validate(createAdvogadoSchema), userController.createAdvogado);
router.put('/advogados/:id', authMiddleware(['administrador']), validate(updateAdvogadoSchema), userController.updateAdvogado);
router.delete('/advogados/:id', authMiddleware(['administrador']), userController.deleteAdvogado);

// 3. ROTAS DE SISTEMA / ADMINISTRAÇÃO GERAL
router.patch('/role/:uid', authMiddleware(['administrador']), validate(updateRoleSchema), userController.updateRole);
// Rota genérica de lista (opcional, se você usar para listar todos os usuários)
router.get('/', authMiddleware(['administrador']), userController.list || ((req, res) => res.sendStatus(200)));

module.exports = router;