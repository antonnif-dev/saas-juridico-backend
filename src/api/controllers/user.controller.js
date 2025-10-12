const userService = require('../../modules/user/user.service');

class UserController {
  async updateRole(req, res) {
    try {
      const { uid } = req.params;
      const { role } = req.body;

      if (!role) {
        return res.status(400).json({ message: 'O campo "role" é obrigatório.' });
      }

      const result = await userService.setUserRole(uid, role);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atribuir perfil.', error: error.message });
    }
  }
  async getMe(req, res) {
    try {
      res.status(200).json(req.user);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar informações do usuário.', error: error.message });
    }
  }

  async createAdvogado(req, res) {
    try {
      const newUser = await userService.createAdvogado(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ message: 'Este e-mail já está em uso.' });
      }
      console.error("!!! ERRO AO CRIAR ADVOGADO:", error);
      res.status(500).json({ message: 'Erro interno ao criar o usuário advogado.' });
    }
  }
}

module.exports = new UserController();