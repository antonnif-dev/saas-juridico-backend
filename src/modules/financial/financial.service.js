const repository = require('./financial.repository');

class FinancialService {
  async createTransaction(data, userId) {
    // data: { titulo, valor, tipo (honorario/despesa), processoId, clienteId, vencimento }
    return await repository.create({ ...data, createdBy: userId });
  }

  async getTransactions(userId) {
    return await repository.findAllByUser(userId);
  }

  async getTransactionsByCase(processoId) {
    return await repository.findByCase(processoId);
  }

  async markAsPaid(id) {
    return await repository.update(id, { status: 'paid', paidAt: new Date() });
  }
}

module.exports = new FinancialService();