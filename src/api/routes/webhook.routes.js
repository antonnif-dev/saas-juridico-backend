const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Rota que o Upstash irá chamar
// POST /api/webhooks/qstash
router.post('/qstash', webhookController.handleQStash);

module.exports = router;