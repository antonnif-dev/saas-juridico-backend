const { db, auth } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');

const collection = db.collection('preatendimentos');
const clientsCollection = db.collection('clients');
const processosCollection = db.collection('processo');

class PreAtendimentoRepository {
  get collection() {
    return db.collection('preatendimentos');
  }

  get clientsCollection() { return db.collection('clients'); }
  get processosCollection() { return db.collection('processo'); }

  async create(data) {
    const docRef = await collection.add({
      ...data,
      status: 'Pendente',
      createdAt: new Date(),
      clientId: data.clientId || null
    });
    return { id: docRef.id, ...data };
  }

  async findAll() {
    const snapshot = await collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findAllByClientId(clientId) {
    const snapshot = await this.collection
      .where('clientId', '==', clientId)
      .orderBy('createdAt', 'desc')
      .get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async updateStatus(id, status) {
    await collection.doc(id).update({ status });
  }

  async delete(id) {
    await collection.doc(id).delete();
  }

  async updateProposal(id, data) {
    await collection.doc(id).update(data);
  }

  async addFile(id, fileData) {
    await collection.doc(id).update({
      adminFiles: FieldValue.arrayUnion(fileData)
    });
    return fileData;
  }

  async convertToCase(id, data, adminId) {
    let uid = data.clientId;
    let tempPassword = null;

    if (!uid) {
      try {
        tempPassword = Math.random().toString(36).slice(-8) + "Aa1@";
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
          tempPassword = "Utilize sua senha já cadastrada.";
        } else {
          throw error;
        }
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
      updatedAt: FieldValue.serverTimestamp(),
      convertedFrom: FieldValue.arrayUnion(id)
    };
    batch.set(clientRef, clientData, { merge: true });

    const caseRef = processosCollection.doc();
    const processoData = {
      titulo: `Caso: ${data.categoria}`,
      descricao: data.resumoProblema,
      clientId: uid,
      responsavelUid: adminId,
      status: 'Em andamento',
      area: data.categoria,
      createdAt: FieldValue.serverTimestamp(),
      urgencia: data.urgencia,
      numeroProcesso: null,
      valorAcordado: data.proposalValue || null,
      assinatura: data.signature || null,
      anexos: [...(data.clientFiles || []), ...(data.adminFiles || [])]
    };
    batch.set(caseRef, processoData);

    const preRef = collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedProcessoId: caseRef.id });

    await batch.commit();

    return {
      success: true,
      tempPassword: tempPassword,
      clientId: uid,
      processoId: caseRef.id
    };
  }
}

module.exports = new PreAtendimentoRepository();