const express = require('express');
const router = express.Router();
const themeController = require('../controllers/theme.controller');
const authMiddleware = require('../middlewares/auth.middleware');
const multer = require('multer');

// Configuração básica do Multer (memória)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // Limite de 5MB
});

// Rotas existentes...
router.get('/', themeController.get);
router.put('/', authMiddleware(['administrador']), themeController.update);

// NOVA ROTA DE UPLOAD
router.post(
  '/upload-logo',
  authMiddleware(['administrador']),
  upload.single('logo'), // 'logo' é o nome do campo que enviaremos do front
  themeController.uploadLogo
);

module.exports = router;