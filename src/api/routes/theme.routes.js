const express = require('express');
const router = express.Router();
const themeController = require('../controllers/theme.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.get('/', themeController.get);

router.put(
  '/',
  authMiddleware(['administrador']),
  themeController.update
);

module.exports = router;