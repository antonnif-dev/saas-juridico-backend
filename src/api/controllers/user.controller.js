const userService = require('../../modules/user/user.service');

class UserController {

  // --- MÉTODO CORRIGIDO E ROBUSTO (Update Profile) ---
  async updateMe(req, res) {
    try {
      const uid = req.user.uid;
      // Delega toda a complexidade para o serviço
      const updatedUser = await userService.updateMe(uid, req.body);

      return res.status(200).json({
        message: 'Perfil atualizado com sucesso.',
        user: updatedUser
      });
    } catch (error) {
      console.error('Erro ao atualizar perfil (Controller):', error);

      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ message: 'Este e-mail já está em uso.' });
      }

      return res.status(500).json({
        message: 'Erro interno ao atualizar perfil.',
        error: error.message
      });
    }
  }

  // --- DEMAIS MÉTODOS DO SISTEMA ---

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
      const userData = await userService.getMe(req.user.uid);
      res.status(200).json(userData);
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

  async listAdvogados(req, res) {
    try {
      const users = await userService.listAdvogados();
      res.status(200).json(users);
    } catch (error) {
      console.error("!!! ERRO AO LISTAR ADVOGADOS:", error);
      res.status(500).json({ message: 'Erro interno ao listar usuários.' });
    }
  }

  async updateAdvogado(req, res) {
    try {
      const { id } = req.params;
      const updatedUser = await userService.updateAdvogado(id, req.body);
      res.status(200).json(updatedUser);
    } catch (error) {
      console.error("!!! ERRO AO ATUALIZAR ADVOGADO:", error);
      res.status(500).json({ message: 'Erro interno ao atualizar usuário.' });
    }
  }

  async deleteAdvogado(req, res) {
    try {
      const { id } = req.params;
      await userService.deleteAdvogado(id);
      res.status(204).send();
    } catch (error) {
      console.error("!!! ERRO AO DELETAR ADVOGADO:", error);
      res.status(500).json({ message: 'Erro interno ao deletar usuário.' });
    }
  }

  async uploadPhoto(req, res) {
    try {
      if (!req.file) return res.status(400).json({ message: 'Nenhuma imagem enviada.' });

      // O service já retorna { photoUrl: result.secure_url }
      const result = await userService.uploadProfilePhoto(req.user.uid, req.file);

      // Retornamos explicitamente para o front atualizar o estado local
      res.status(200).json({
        message: 'Foto atualizada com sucesso',
        photoUrl: result.photoUrl
      });
    } catch (error) {
      console.error("Erro no uploadPhoto (Controller):", error);
      res.status(500).json({ message: 'Erro ao enviar foto.', error: error.message });
    }
  }

}
module.exports = new UserController();