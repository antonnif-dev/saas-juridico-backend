const financialService = require('../../modules/financial/financial.service');

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
        if (txn.status === 'pending') summary.totalPendente += txn.valor;
        else if (txn.status === 'paid') summary.totalPago += txn.valor;
        else if (txn.status === 'overdue') summary.totalAtrasado += txn.valor;
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
}

module.exports = new FinancialController();