const { db } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');

class ProcessoRepository {
  get collection() {
    return db.collection('processo');
  }

  async create(data) {
    const docRef = await this.collection.add(data);
    return { id: docRef.id, ...data };
  }

  async findAllByOwner(userId) {
    const snapshot = await this.collection.where('responsavelUid', '==', userId).get();
    if (snapshot.empty) {
      const legacySnapshot = await this.collection.where('createdBy', '==', userId).get();
      return legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(id) {
    const doc = await this.collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }

  async update(id, data) {
    const updatePayload = {
      ...data,
      updatedAt: FieldValue.serverTimestamp(),
    };    
    await this.collection.doc(id).update(updatePayload);    
    const updatedDoc = await this.collection.doc(id).get();
    return { id: updatedDoc.id, ...updatedDoc.data() };
  }

  async delete(id) {
    await this.collection.doc(id).delete();
  }

  async findAllByClientId(clientId) {
    const snapshot = await this.collection.where('clientId', '==', clientId).get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async addMovimentacao(processoId, movimentacaoData) {
    const movimentacaoRef = await this.movimentacoesCollection(processoId).add(movimentacaoData);
    return { id: movimentacaoRef.id, ...movimentacaoData };
  }

  async findAllMovimentacoes(processoId) {
    const snapshot = await this.movimentacoesCollection(processoId).orderBy('data', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateMovimentacao(processoId, movimentacaoId, dataToUpdate) {
    const docRef = this.collection.doc(processoId).collection('movimentacoes').doc(movimentacaoId);
    await docRef.update(dataToUpdate);
    return { id: movimentacaoId, ...dataToUpdate };
  }

  async deleteMovimentacao(processoId, movimentacaoId) {
    await this.collection.doc(processoId).collection('movimentacoes').doc(movimentacaoId).delete();
  }

  async addDocument(caseId, docData) {
    const { FieldValue } = require('firebase-admin/firestore');
    await this.collection.doc(caseId).update({
      documentos: FieldValue.arrayUnion(docData)
    });
  }

}

module.exports = new ProcessoRepository();