const financialService = require('../../modules/financial/financial.service');
const { uploadBufferToCloudinary } = require("../utils/cloudinaryUpload");

class FinancialController {
  async list(req, res) {
    try {
      const user = req.user;

      const transactions = await financialService.getTransactions(user);

      const summary = {
        totalPendente: 0,
        totalPago: 0,
        totalAtrasado: 0
      };

      transactions.forEach(txn => {
        const valor = txn.valor || 0;
        const isDespesa = txn.tipo === 'despesa';

        if (txn.status === 'pending') {
          summary.totalPendente += valor;
        } else if (txn.status === 'paid') {
          // Se for despesa, subtrai do total pago para dar o saldo real de caixa
          summary.totalPago += isDespesa ? -valor : valor;
        } else if (txn.status === 'overdue') {
          summary.totalAtrasado += valor;
        }
      });

      res.status(200).json({
        transactions,
        summary
      });
    } catch (error) {
      console.error("Erro ao listar financeiro:", error);
      res.status(500).json({ message: 'Erro ao processar dados financeiros.' });
    }
  }
  async create(req, res) {
    try {
      const newTransaction = await financialService.createTransaction(req.body, req.user);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      res.status(500).json({ message: 'Erro ao salvar lançamento financeiro.' });
    }
  }
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const updateData = { status, updatedAt: new Date() };

      if (status === 'paid') {
        updateData.dataPagamento = new Date();
      }

      const updated = await financialService.updateStatus(id, updateData);
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar transação.' });
    }
  }

  async payTransaction(req, res) {
    try {
      const { id } = req.params;
      const updateData = {
        status: 'paid',
        dataPagamento: new Date(),
        updatedAt: new Date()
      };

      const updated = await financialService.updateStatus(id, updateData);
      res.status(200).json(updated);
    } catch (error) {
      console.error("Erro ao pagar transação:", error);
      res.status(500).json({ message: 'Erro ao processar pagamento.' });
    }
  }

  async listByProcess(req, res) {
    try {
      const { processoId } = req.params;
      // Aqui chamamos o service passando o filtro de processo
      const transactions = await financialService.getTransactionsByProcess(processoId);
      res.status(200).json(transactions);
    } catch (error) {
      console.error("Erro ao listar financeiro por processo:", error);
      res.status(500).json({ message: 'Erro ao buscar dados do processo.' });
    }
  }

  async uploadRecibo(req, res) {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: 'Arquivo de recibo é obrigatório.' });
      }

      const reciboUrl = req.file.path || req.file.url;

      if (!reciboUrl) {
        return res.status(500).json({ message: 'Não foi possível obter a URL do recibo.' });
      }

      const updateData = {
        reciboUrl,
        reciboNome: req.file.originalname || null,
        reciboTipo: req.file.mimetype || null,
        reciboUploadedAt: new Date(),
        updatedAt: new Date()
      };

      const updated = await financialService.updateStatus(id, updateData);
      return res.status(200).json(updated);
    } catch (error) {
      console.error("Erro ao enviar recibo:", error);
      return res.status(500).json({ message: 'Erro ao anexar recibo.' });
    }
  }

  async uploadRecibo(req, res) {
    try {
      const { id } = req.params;

      if (!req.file) {
        return res.status(400).json({ message: "Arquivo de recibo é obrigatório." });
      }

      // Upload para Cloudinary
      const result = await uploadBufferToCloudinary(req.file.buffer, {
        folder: "saas-juridico/recibos",
        public_id: `recibo_${id}_${Date.now()}`,
      });

      const updateData = {
        reciboUrl: result.secure_url,
        reciboPublicId: result.public_id,
        reciboNome: req.file.originalname || null,
        reciboTipo: req.file.mimetype || null,
        reciboUploadedAt: new Date(),
        updatedAt: new Date(),
      };

      // Reaproveita seu updateStatus (ele já faz update no repo)
      const updated = await financialService.updateStatus(id, updateData);

      return res.status(200).json(updated);
    } catch (error) {
      console.error("Erro ao anexar recibo:", error);
      return res.status(500).json({ message: "Erro ao anexar recibo.", error: error.message });
    }
  }
}

module.exports = new FinancialController();