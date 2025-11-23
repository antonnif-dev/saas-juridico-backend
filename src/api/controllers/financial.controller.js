const service = require('../../modules/financial/financial.service');

class FinancialController {
  async create(req, res) {
    try {
      const result = await service.createTransaction(req.body, req.user.uid);
      res.status(201).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async list(req, res) {
    try {
      // Se vier ?processoId=XYZ na URL, filtra por caso. Se não, lista tudo.
      const { processoId } = req.query;
      const result = processoId 
        ? await service.getTransactionsByCase(processoId)
        : await service.getTransactions(req.user.uid);
      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async pay(req, res) {
    try {
      const { id } = req.params;
      await service.markAsPaid(id);
      res.status(200).json({ message: 'Transação paga.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new FinancialController();