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
    if (!clientId) return [];

    const col = this.collection;
    let snapshot;
    try {
      snapshot = await col
        .where('clientId', '==', clientId)
        .orderBy('dataVencimento', 'desc')
        .get();
    } catch (err) {
      // fallback sem orderBy (não exige índice composto)
      snapshot = await col.where('clientId', '==', clientId).get();
    }

    const items = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    items.sort((a, b) => {
      const aTime =
        a?.dataVencimento?._seconds ? a.dataVencimento._seconds * 1000 : new Date(a.dataVencimento || 0).getTime();
      const bTime =
        b?.dataVencimento?._seconds ? b.dataVencimento._seconds * 1000 : new Date(b.dataVencimento || 0).getTime();
      return bTime - aTime;
    });

    return items;
  }

  // MÉTODO CHAVE PARA O RELATÓRIO FINAL
  async findAllByProcess(processoId) {
    const snapshot = await this.collection
      .where('processoId', '==', processoId)
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async update(id, data) {
    const docRef = this.collection.doc(id);
    await docRef.update(data);
    return { id, ...data };
  }
}

module.exports = new FinancialRepository();