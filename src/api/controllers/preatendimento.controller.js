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
  /*
    async convert(req, res) {
      try {
        const { id } = req.params;
        const { data } = req.body;
        const adminId = req.user.uid;
        const result = await service.convert(id, data, adminId);
  
        res.status(200).json({
          message: 'Convertido com sucesso!',
          tempPassword: result.tempPassword,
          clientId: result.clientId
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
      }
    }
  */
  async convert(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body;
      const adminId = req.user.uid;

      const result = await service.convert(id, data, adminId);
      res.status(200).json(result);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: error.message });
    }
  }
  /*  
  async delete(req, res) {
    try {
      const { id } = req.params;
      await service.reject(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
*/
  async delete(req, res) {
    try {
      const { id } = req.params;
      await service.delete(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async accept(req, res) {
    try {
      const { id } = req.params;
      await service.accept(id);
      res.status(200).json({ message: 'Aceito para negociação.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
  /*
    async updateProposal(req, res) {
      try {
        const { id } = req.params;
        const data = req.body;
        const adminId = req.user.uid;
        const result = await service.convert(id, data, adminId);
        await service.updateProposal(id, data);
        res.status(200).json({ message: 'Proposta atualizada.' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  */
  async updateProposal(req, res) {
    try {
      const { id } = req.params;
      await service.updateProposal(id, req.body);
      res.status(200).json({ message: 'Atualizado.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async finalize(req, res) {
    try {
      const { id } = req.params;
      const { data } = req.body; // Dados completos atuais do lead
      const adminId = req.user.uid;

      const result = await service.finalizeCase(id, data, adminId);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async upload(req, res) {
    try {
      const { id } = req.params;
      if (!req.file) throw new Error("Nenhum arquivo enviado.");
      const result = await service.uploadFile(id, req.file);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PreAtendimentoController();