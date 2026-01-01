const processoService = require('../../modules/case/case.service');
const axios = require('axios');

class CaseController {
  async create(req, res) {
    try {
      const user = req.user;
      const newCase = await processoService.createCase(req.body, user);
      res.status(201).json(newCase);
    } catch (error) {
      console.error('!!! ERRO no Controller:', error);
      res.status(500).json({ message: 'Erro ao criar processo.', error: error.message });
    }
  }

  async list(req, res) {
  try {
    const cases = await processoService.getCasesForUser(req.user); 
    res.status(200).json(cases);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar processos.', error: error.message });
  }
}

  async getById(req, res) {
    try {
      const { id } = req.params;
      const processo = await processoService.getCaseById(id, req.user);
      res.status(200).json(processo);
    } catch (error) {
      const statusCode = error.message.includes('Acesso não permitido') ? 403 : 404;
      res.status(statusCode).json({ message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const user = req.user; // Contém uid e role
      const updatedCase = await processoService.updateProcesso(id, req.body, user);
      res.status(200).json(updatedCase);
    } catch (error) {
      const statusCode = error.message.includes('Permissão') ? 403 : 404;
      res.status(statusCode).json({ message: error.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const user = req.user;
      await processoService.deleteCase(id, user);
      res.status(204).send();
    } catch (error) {
      const statusCode = error.message.includes('Permissão') ? 403 : 404;
      res.status(statusCode).json({ message: error.message });
    }
  }

  async uploadDocument(req, res) {
    try {
      const { id } = req.params;
      const file = req.file; // 'file' é injetado pelo multer
      const user = req.user;

      const documentRecord = await processoService.uploadDocumentToCase(id, file, user);
      res.status(200).json({ message: 'Upload bem-sucedido', document: documentRecord });
    } catch (error) {
      res.status(500).json({ message: 'Erro durante o upload.', error: error.message });
    }
  }

  async addMovimentacao(req, res) {
    try {
      const { processoId } = req.params;
      const { descricao } = req.body;
      const user = req.user;

      if (!descricao) {
        return res.status(400).json({ message: 'A descrição é obrigatória.' });
      }

      const novaMovimentacao = await processoService.addMovimentacao(processoId, { descricao }, user);
      res.status(201).json(novaMovimentacao);
    } catch (error) {
      const statusCode = error.message.includes('Permissão') ? 403 : 500;
      res.status(statusCode).json({ message: error.message });
    }
  }

  async getAllMovimentacoes(req, res) {
    try {
      const { processoId } = req.params;
      const movimentacoes = await processoService.getAllMovimentacoes(processoId);
      res.status(200).json(movimentacoes);
    } catch (error) {
      console.error("!!! ERRO AO BUSCAR MOVIMENTAÇÕES:", error);
      res.status(500).json({ message: 'Erro interno ao buscar movimentações.' });
    }
  }

  async updateMovimentacao(req, res) {
    try {
      const { processoId, movimentacaoId } = req.params;
      const { descricao } = req.body;
      const updatedMovimentacao = await processoService.updateMovimentacao(processoId, movimentacaoId, { descricao });
      res.status(200).json(updatedMovimentacao);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno ao atualizar movimentação.' });
    }
  }

  async deleteMovimentacao(req, res) {
    try {
      const { processoId, movimentacaoId } = req.params;
      await processoService.deleteMovimentacao(processoId, movimentacaoId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: 'Erro interno ao excluir movimentação.' });
    }
  }

  async uploadDocument(req, res) {
    try {
      const { id: processoId } = req.params;
      const file = req.file;
      const user = req.user;

      if (!file) {
        return res.status(400).json({ message: 'Nenhum arquivo enviado.' });
      }

      const newDocument = await processoService.uploadDocumentToCase(processoId, file, user);
      res.status(201).json({ document: newDocument });
    } catch (error) {
      console.error("!!! ERRO NO UPLOAD:", error);
      res.status(500).json({ message: 'Erro interno ao fazer upload do documento.' });
    }
  }

  async downloadDocument(req, res) {
    try {
      const { id: processoId, docId } = req.params;
      const user = req.user;
      const docRecord = await processoService.getDocumentRecord(processoId, docId, user);
      const response = await axios({
        method: 'GET',
        url: docRecord.url,
        responseType: 'stream',
      });
      res.setHeader('Content-Type', docRecord.tipo);
      res.setHeader('Content-Disposition', `inline; filename="${docRecord.nome}"`);
      response.data.pipe(res);
    } catch (error) {
      console.error("!!! ERRO AO SERVIR DOCUMENTO:", error);
      res.status(404).json({ message: error.message });
    }
  }


}

module.exports = new CaseController();