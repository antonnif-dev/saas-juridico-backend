const financialRepository = require('./financial.repository');

class FinancialService {
  async createTransaction(data, user) {
    const transactionData = {
      ...data,
      criadoPor: user.uid,
      status: data.status || 'pending',
      createdAt: new Date()
    };
    return await financialRepository.create(transactionData);
  }

  async getTransactions(user) {
    // Se for cliente, vê só as dele. Se for staff, vê tudo.
    if (user.role === 'cliente') {
      return await financialRepository.findAllByClient(user.uid);
    }
    return await financialRepository.findAll();
  }

  async getFinancialSummary(user) {
    const txs = await this.getTransactions(user);

    return {
      totalPendente: txs.filter(t => t.status === 'pending').reduce((acc, t) => acc + t.valor, 0),
      totalPagoMes: txs.filter(t => t.status === 'paid').reduce((acc, t) => acc + t.valor, 0), // Filtrar por mês atual
      totalAtrasado: txs.filter(t => t.status === 'overdue').reduce((acc, t) => acc + t.valor, 0)
    };
  }
/*
  async getProcessFinancialSummary(processoId) {
    const transactions = await financialRepository.findAllByProcess(processoId);
    const totalReceita = transactions.filter(t => t.tipo === 'receita' && t.status === 'paid').reduce((acc, t) => acc + t.valor, 0);
    const totalDespesa = transactions.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);

    return {
      lucroLiquido: totalReceita - totalDespesa,
      extrato: transactions,
      pendencias: transactions.filter(t => t.status !== 'paid')
    };
  }
*/
  async markAsPaid(id) {
    const updateData = {
      status: 'paid',
      dataPagamento: new Date(),
      updatedAt: new Date()
    };
    return await financialRepository.update(id, updateData);
  }

  async getProcessSummary(processoId) {
    const txns = await financialRepository.findByProcessId(processoId);
    
    return {
      totalReceitas: txns.filter(t => t.tipo === 'receita' && t.status === 'paid').reduce((acc, t) => acc + t.valor, 0),
      totalDespesas: txns.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0),
      pendencias: txns.filter(t => t.status === 'pending').length,
      extrato: txns
    };
  }
}

module.exports = new FinancialService();