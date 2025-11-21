const express = require('express');
const router = express.Router();
const controller = require('../controllers/financial.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.use(authMiddleware(['administrador', 'advogado', 'cliente']));

router.post('/', controller.create);
router.get('/', controller.list); // Aceita query param ?caseId=...
router.put('/:id/pay', controller.pay);

module.exports = router;