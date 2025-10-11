const { db } = require('../../config/firebase.config');
const agendaCollection = db.collection('agenda');

class AgendaRepository {
  async create(itemData) {
    const docRef = await agendaCollection.add(itemData);
    return { id: docRef.id, ...itemData };
  }

  // Busca os compromissos de um usuário, ordenados por data
  async findByUser(userId) {
    const snapshot = await agendaCollection
    .where('responsavelUid', '==', userId)
    .orderBy('dataHora', 'asc')
    .get();
    
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  async findAllByUser(userId) {
    // 1. Busca TODOS os documentos da coleção.
    const snapshot = await agendaCollection.get();

    if (snapshot.empty) return [];

    // 2. Converte os documentos para um array.
    const todosOsCompromissos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // 3. Filtra o array em JavaScript para retornar apenas os do usuário logado.
    const compromissosDoUsuario = todosOsCompromissos.filter(
      compromisso => compromisso.responsavelUid === userId
    );

    return compromissosDoUsuario;
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