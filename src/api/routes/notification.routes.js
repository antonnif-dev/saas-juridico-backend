const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notification.controller');
const authMiddleware = require('../middlewares/auth.middleware');

// Ambas as rotas exigem que o usuário esteja logado
router.get('/read-status', authMiddleware(), notificationController.getReadStatus);
router.post('/read/:id', authMiddleware(), notificationController.markRead);

module.exports = router;