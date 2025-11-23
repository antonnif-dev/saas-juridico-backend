const { db } = require('../../config/firebase.config');
const casesCollection = db.collection('processo');
const { FieldValue } = require('firebase-admin/firestore');

class ProcessoRepository {
  get collection() {
    return db.collection('processo');
  }
  /*
  async create(processoData) {
    const docRef = await casesCollection.add(processoData);
    return { id: docRef.id, ...processoData };
  }*/

  async create(data) {
    const docRef = await this.collection.add(data);
    return { id: docRef.id, ...data };
  }
/*
  async findAllByOwner(userId) {
    const snapshot = await casesCollection.where('responsavelUid', '==', userId).get();
    if (snapshot.empty) {
      const legacySnapshot = await casesCollection.where('createdBy', '==', userId).get();
      if (legacySnapshot.empty) return [];
      return legacySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }*/

  async findAllByOwner(userId) {
    const snapshot = await this.collection.where('responsavelUid', '==', userId).get();    
    if (snapshot.empty) {
        return [];
    }    
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findById(id) {
    const doc = await collection.doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
/*
  async findAllByWorkspace(workspaceId) {
    const snapshot = await casesCollection.where('workspaceId', '==', workspaceId).get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
  
    async update(caseId, dataToUpdate) {
      await casesCollection.doc(caseId).update(dataToUpdate);
      return { id: caseId, ...dataToUpdate };
    }
  
    async delete(caseId) {
      await casesCollection.doc(caseId).delete();
    }*/

  async update(id, data) {
    const cleanData = JSON.parse(JSON.stringify(data));
    await collection.doc(id).update(data);
    return { id, ...cleanData };
  }

  async delete(id) {
    await collection.doc(id).delete();
  }

  async findAllByClientId(clientId) {
    const snapshot = await casesCollection.where('clientId', '==', clientId).get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async addMovimentacao(processoId, movimentacaoData) {
    const movimentacaoRef = await casesCollection.doc(processoId).collection('movimentacoes').add(movimentacaoData);
    return { id: movimentacaoRef.id, ...movimentacaoData };
  }

  async findAllMovimentacoes(processoId) {
    const snapshot = await casesCollection.doc(processoId).collection('movimentacoes').orderBy('data', 'desc').get();
    if (snapshot.empty) {
      return [];
    }
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateMovimentacao(processoId, movimentacaoId, dataToUpdate) {
    const docRef = casesCollection.doc(processoId).collection('movimentacoes').doc(movimentacaoId);
    await docRef.update(dataToUpdate);
    return { id: movimentacaoId, ...dataToUpdate };
  }

  async deleteMovimentacao(processoId, movimentacaoId) {
    await casesCollection.doc(processoId).collection('movimentacoes').doc(movimentacaoId).delete();
  }
/*     addDocument com processoId, não caseId
  async addDocument(processoId, documentData) {
    const caseRef = casesCollection.doc(processoId);
    await caseRef.update({
      documentos: FieldValue.arrayUnion(documentData)
    });
  }*/

  async addDocument(caseId, docData) {
    const { FieldValue } = require('firebase-admin/firestore');
    await this.collection.doc(caseId).update({
      documentos: FieldValue.arrayUnion(docData)
    });
  }


}

module.exports = new ProcessoRepository();