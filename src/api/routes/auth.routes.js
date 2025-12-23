// src/modules/auth/auth.routes.js

const express = require("express");
const router = express.Router();
const authMiddleware = require("../../middlewares/auth.middleware");
const authController = require("./auth.controller");

// Apenas tenant_admin e superadmin podem criar usuários
router.post(
  "/create",
  authMiddleware(["superadmin", "tenant_admin"]),
  (req, res) => authController.createUser(req, res)
);

// Qualquer usuário autenticado pode ver seu próprio perfil
router.get(
  "/me",
  authMiddleware(),
  (req, res) => authController.myProfile(req, res)
);

module.exports = router;