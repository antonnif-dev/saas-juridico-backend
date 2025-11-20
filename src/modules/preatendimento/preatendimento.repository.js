const { db, auth } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');
const collection = db.collection('preatendimentos');
const clientsCollection = db.collection('clients');
const casesCollection = db.collection('processo');

class PreAtendimentoRepository {
  async create(data) {
    const docRef = await collection.add({
      ...data,
      status: 'Pendente', // Status inicial
      createdAt: new Date()
    });
    return { id: docRef.id, ...data };
  }

  async findAll() {
    const snapshot = await collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateStatus(id, status) {
    await collection.doc(id).update({ status });
  }

  async delete(id) {
    await collection.doc(id).delete();
  }

  async convertToCase(id, data, adminId) {
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1@";
    let uid;

    try {
      const userRecord = await auth.createUser({
        email: data.email,
        password: tempPassword,
        displayName: data.nome,
      });
      uid = userRecord.uid;
      await auth.setCustomUserClaims(uid, { role: 'cliente', clientId: uid });
    } catch (error) {
      if (error.code === 'auth/email-already-exists') {
        const existingUser = await auth.getUserByEmail(data.email);
        uid = existingUser.uid;
      } else {
        throw error;
      }
    }

    const batch = db.batch();

    const clientRef = clientsCollection.doc(uid);
    const clientData = {
      name: data.nome,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.telefone,
      address: data.endereco,
      status: 'ativo',
      createdAt: new Date(),
      convertedFrom: id
    };
    batch.set(clientRef, clientData, { merge: true });

    const caseRef = casesCollection.doc();
    const caseData = {
      titulo: `Caso: ${data.categoria}`,
      descricao: data.resumoProblema,
      clientId: clientRef.id,
      responsavelUid: adminId,
      status: 'Em andamento',
      area: data.categoria,
      createdAt: new Date(),
      urgencia: data.urgencia,
      numeroProcesso: 'Aguardando Distribuição'
    };
    batch.set(caseRef, caseData);

    const preRef = collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedCaseId: caseRef.id });

    await batch.commit();
    return {
      success: true,
      tempPassword: tempPassword,
      isNewUser: true,
      clientId: uid,
      caseId: caseRef.id
    };
  }
}

module.exports = new PreAtendimentoRepository();