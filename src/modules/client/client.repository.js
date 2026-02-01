const { db } = require('../../config/firebase.config');
const clientsCollection = db.collection('clients');

class ClientRepository {
  async create(clientData) {
    const docRef = await clientsCollection.add(clientData);
    return { id: docRef.id, ...clientData };
  }

  async findAll() {
    const snapshot = await clientsCollection.get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(clientId) {
    const doc = await clientsCollection.doc(clientId).get();
    if (!doc.exists) {
      return null;
    }
    return { id: doc.id, ...doc.data() };
  }

  async findByEmail(email) {
    const snapshot = await clientsCollection.where('email', '==', email).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }

  async update(clientId, dataToUpdate) {
    await clientsCollection.doc(clientId).update(dataToUpdate);
    return { id: clientId, ...dataToUpdate };
  }

  async delete(clientId) {
    await clientsCollection.doc(clientId).delete();
  }
}

module.exports = new ClientRepository();