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
  async updateStatus(id, updateData) {
    // Garante que o repositório receba os dados para atualizar o Firestore
    return await financialRepository.update(id, updateData);
  }

  async getProcessSummary(processoId) {
    // Certifique-se que o repository tenha o método findAllByProcess ou findByProcessId
    const txns = await financialRepository.findAllByProcess(processoId);

    const receitas = txns.filter(t => t.tipo === 'receita' && t.status === 'paid').reduce((acc, t) => acc + t.valor, 0);
    const despesas = txns.filter(t => t.tipo === 'despesa').reduce((acc, t) => acc + t.valor, 0);

    return {
      totalReceitas: receitas,
      totalDespesas: despesas,
      lucroLiquido: receitas - despesas,
      pendencias: txns.filter(t => t.status === 'pending').length,
      extrato: txns
    };
  }
}

module.exports = new FinancialService();