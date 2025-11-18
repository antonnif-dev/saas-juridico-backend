const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const messageController = require('../controllers/message.controller');

router.use(authMiddleware()); // Protege todas as rotas

// POST /api/mensagens/conversas (Criar/Iniciar conversa)
router.post('/conversas', messageController.createConversation);

// GET /api/mensagens/conversas (Listar conversas)
router.get('/conversas', messageController.listConversations);

module.exports = router;