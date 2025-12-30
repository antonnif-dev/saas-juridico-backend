const financialService = require('../../modules/financial/financial.service');

class FinancialController {
  /**
   * Lista as transações e retorna o resumo consolidado para os cards do Dashboard.
   */
  async list(req, res) {
    try {
      const user = req.user;
      
      // Busca as transações baseadas na role (Service já filtra)
      const transactions = await financialService.getTransactions(user);
      
      // Consolida os totais para os cards do topo (Pendente, Pago, Atrasado)
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

  /**
   * Cria um novo lançamento financeiro (Honorários, Custas, etc).
   */
  async create(req, res) {
    try {
      const newTransaction = await financialService.createTransaction(req.body, req.user);
      res.status(201).json(newTransaction);
    } catch (error) {
      console.error("Erro ao criar transação:", error);
      res.status(500).json({ message: 'Erro ao salvar lançamento financeiro.' });
    }
  }

  /**
   * Atualiza o status de uma transação (Ex: De pendente para pago).
   */
  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const updated = await financialService.updateStatus(id, status);
      res.status(200).json(updated);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao atualizar status da transação.' });
    }
  }
}

module.exports = new FinancialController();