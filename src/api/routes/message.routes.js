const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth.middleware');
const messageController = require('../controllers/message.controller');
const requireMessageOwnership = require('../middlewares/message-ownership.middleware');

router.use(authMiddleware()); // Protege todas as rotas

// POST /api/mensagens/conversas (Criar/Iniciar conversa)
router.post('/conversas', messageController.createConversation);

router.post('/conversas/:conversationId/mensagens', messageController.sendMessage);

// GET /api/mensagens/conversas (Listar conversas)
router.get('/conversas', messageController.listConversations);

router.get('/conversas/:conversationId/mensagens', messageController.listMessages);

module.exports = router;