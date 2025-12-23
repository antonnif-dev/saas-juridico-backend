// src/modules/auth/auth.controller.js

const authService = require("./auth.service");

class AuthController {

  async createUser(req, res) {
    try {
      const { name, email, password, role } = req.body;
      const tenantId = req.user.tenantId; // vem do Firebase Token

      if (!["superadmin", "tenant_admin", "lawyer", "assistant", "client"].includes(role)) {
        return res.status(400).send({ message: "Invalid role" });
      }

      const newUser = await authService.createUser({
        name,
        email,
        password,
        role,
        tenantId,
      });

      return res.status(201).send(newUser);

    } catch (error) {
      console.error("AUTH CREATE ERROR:", error);
      return res.status(500).send({ message: error.message });
    }
  }

  async myProfile(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const uid = req.user.uid;

      const profile = await authService.getUserProfile(tenantId, uid);

      return res.send(profile);

    } catch (error) {
      console.error("AUTH PROFILE ERROR:", error);
      return res.status(500).send({ message: error.message });
    }
  }
}

module.exports = new AuthController();