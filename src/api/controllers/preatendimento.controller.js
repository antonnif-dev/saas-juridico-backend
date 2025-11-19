const service = require('../../modules/preatendimento/preatendimento.service');

class PreAtendimentoController {
  async create(req, res) {
    try {
      await service.create(req.body);
      res.status(201).json({ message: 'Pré-atendimento enviado.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      const items = await service.listAll();
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body; // 'aceitar' ou 'converter'
      
      if (status === 'aceitar') {
        await service.accept(id);
      }
      res.status(200).json({ message: 'Status atualizado.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async convert(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body; // Dados completos do lead para criar o cliente
      await service.convert(id, data);
      res.status(200).json({ message: 'Convertido em processo com sucesso!' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      await service.reject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PreAtendimentoController();