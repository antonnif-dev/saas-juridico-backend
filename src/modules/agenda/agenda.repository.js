const { db } = require('../../config/firebase.config');
const agendaCollection = db.collection('agenda');

class AgendaRepository {
  async create(itemData) {
    const docRef = await agendaCollection.add(itemData);
    return { id: docRef.id, ...itemData };
  }

  async findByUser(userId) {
    const snapshot = await agendaCollection
      .where('responsavelUid', '==', userId)
      .orderBy('dataHora', 'asc')
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findAll() {
    const snapshot = await agendaCollection
      .orderBy('dataHora', 'asc')
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findAllByUser(userId) {
    const snapshot = await agendaCollection
      .where('responsavelUid', '==', userId)
      .orderBy('dataHora', 'asc')
      .get();

    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(itemId) {
    const doc = await agendaCollection.doc(itemId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async update(itemId, dataToUpdate) {
    await agendaCollection.doc(itemId).update(dataToUpdate);
    return { id: itemId, ...dataToUpdate };
  }

  async delete(itemId) {
    await agendaCollection.doc(itemId).delete();
  }
}

module.exports = new AgendaRepository();