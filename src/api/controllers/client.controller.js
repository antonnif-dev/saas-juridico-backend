const clientService = require('../../modules/client/client.service');

class ClientController {
  async create(req, res) {
    try {
      // O corpo da requisição (req.body) já foi validado pelo middleware
      const client = await clientService.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        return res.status(409).json({ message: 'Este e-mail já está cadastrado no sistema.' });
      }
      console.error('!!! ERRO AO CRIAR CLIENTE:', error);
      res.status(500).json({ message: 'Erro interno ao criar cliente.' });
    }
  }

  async listAll(req, res) {
    try {
      const clients = await clientService.getAllClients();
      res.status(200).json(clients);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno ao listar clientes.', error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const client = await clientService.getClientById(id);
      res.status(200).json(client);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async getMe(req, res) {
    try {
      const client = await clientService.getClientByAuthUid(req.user.uid);
      if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });
      res.status(200).json(client);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar perfil.', error: error.message });
    }
  }

  async getByAuthUid(req, res) {
    try {
      const { authUid } = req.params;
      const client = await clientService.getClientByAuthUid(authUid);
      if (!client) return res.status(404).json({ message: 'Cliente não encontrado.' });
      res.status(200).json(client);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao buscar cliente.', error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updatedClient = await clientService.updateClient(id, req.body);
      res.status(200).json(updatedClient);
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await clientService.deleteClient(id);
      res.status(204).send();
    } catch (error) {
      res.status(404).json({ message: error.message });
    }
  }
}

module.exports = new ClientController();