const userService = require('../../modules/user/user.service');

class UserController {
  async updateRole(req, res) {
    try {
      const { uid } = req.params; // Pega o UID da URL
      const { role } = req.body;   // Pega o novo perfil do corpo da requisição

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
    // req.user é o token decodificado que o auth.middleware adicionou.
    // Ele contém todos os dados do usuário, incluindo os custom claims.
    try {
      res.status(200).json(req.user);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar informações do usuário.', error: error.message });
    }
  }
}

module.exports = new UserController();