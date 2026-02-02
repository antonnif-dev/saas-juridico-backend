const service = require('../../modules/preatendimento/preatendimento.service');
const { db } = require('../../config/firebase.config');

class PreAtendimentoController {
  col() {
    return db.collection('preatendimento');
  }
  async create(req, res) {
    try {
      console.log("➡️ [preatendimento.create] user:", req.user || null);
      console.log("➡️ [preatendimento.create] body:", req.body);
      await service.create(req.body, req.user || null);
      res.status(201).json({ message: 'Pré-atendimento enviado.' });
    } catch (error) {
      console.error("❌ [preatendimento.create] erro:", error);
      console.error("❌ [preatendimento.create] stack:", error.stack);
      res.status(500).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      const items = await service.list(req.user);
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (status === 'aceitar') await service.accept(id);
      res.status(200).json({ message: 'Status atualizado.' });
    } catch (error) { res.status(500).json({ error: error.message }); }
  }

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

  async getById(id) {
    const doc = await this.col().doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const updated = await service.update(id, req.body, req.user);
      return res.status(200).json(updated);
    } catch (error) {
      console.error("❌ [preatendimento.update] erro:", error);
      return res.status(500).json({ error: error.message });
    }
  }

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
      const { data } = req.body;
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

  async getMovimentacoes(req, res) {
    try {
      const { id } = req.params;
      const items = await service.getMovimentacoes(id, req.user);
      res.status(200).json(items);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async addMovimentacao(req, res) {
    try {
      const { id } = req.params;
      const { descricao, origem } = req.body;

      await service.addMovimentacao(id, {
        descricao,
        origem,
        criadoPor: req.user.uid,
      });

      res.status(201).json({ message: 'Movimentação adicionada.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PreAtendimentoController();