const { db } = require('../../config/firebase.config');
const collection = db.collection('transactions');

class FinancialRepository {
  async create(data) {
    const docRef = await collection.add({
      ...data,
      createdAt: new Date(),
      status: data.status || 'pending' // pending, paid, overdue
    });
    return { id: docRef.id, ...data };
  }

  async findAllByUser(userId) {
    // Busca transações onde o advogado é o responsável (ou o cliente vinculado)
    // Simplificado para buscar tudo por enquanto
    const snapshot = await collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findByCase(caseId) {
    const snapshot = await collection.where('processoId', '==', caseId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id, data) {
    await collection.doc(id).update(data);
    return { id, ...data };
  }
}

module.exports = new FinancialRepository();