const { db } = require('../../config/firebase.config');

class FinancialRepository {
  constructor() {
    this.collection = db.collection('financial');
  }

  async create(data) {
    const docRef = await this.collection.add(data);
    return { id: docRef.id, ...data };
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('dataVencimento', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findAllByClient(clientId) {
    const snapshot = await this.collection
      .where('clientId', '==', clientId)
      .orderBy('dataVencimento', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  // MÉTODO CHAVE PARA O RELATÓRIO FINAL
  async findAllByProcess(processoId) {
    const snapshot = await this.collection
      .where('processoId', '==', processoId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id, data) {
    try {
      const docRef = this.collection.doc(id);
      await docRef.update(data);
      return { id, ...data };
    } catch (error) {
      console.error("Erro no Repository ao atualizar:", error);
      throw error;
    }
  }
}

module.exports = new FinancialRepository();