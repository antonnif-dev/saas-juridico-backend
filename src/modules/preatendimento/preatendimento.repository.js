const { db, auth } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');

class PreAtendimentoRepository {
  get collection() {
    return db.collection('preatendimentos');
  }

  get clientsCollection() { return db.collection('clients'); }
  get processosCollection() { return db.collection('processo'); }

  async create(data, user = null) {
    let clientId = null;

    if (user?.role === 'cliente') {
      clientId = user.uid;
    } else if (user?.role === 'administrador' || user?.role === 'advogado') {
      if (data.clientId) {
        const snap = await this.clientsCollection
          .where('authUid', '==', data.clientId)
          .limit(1)
          .get();

        if (snap.empty) {
          throw new Error('clientId inválido: nenhum cliente com este authUid em /clients');
        }

        clientId = data.clientId;
      }
    } else {
      clientId = data.clientId || null;
    }

    const payload = {
      ...data,
      clientId,
      status: 'Pendente',
      createdAt: new Date(),
    };

    Object.keys(payload).forEach((k) => {
      if (payload[k] === undefined) delete payload[k];
    });

    const docRef = await this.collection.add(payload);
    return { id: docRef.id, ...payload };
  }

  async findAll() {
    const snapshot = await this.collection.orderBy('createdAt', 'desc').get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async findAllByClientId(clientId) {
    const snapshot = await this.collection
      .where('clientId', '==', clientId)
      .get();

    const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return docs.sort((a, b) => {
      const dateA = a.createdAt?._seconds ? a.createdAt._seconds : new Date(a.createdAt).getTime() / 1000;
      const dateB = b.createdAt?._seconds ? b.createdAt._seconds : new Date(b.createdAt).getTime() / 1000;
      return dateB - dateA;
    });
  }

  async updateStatus(id, status) {
    await this.collection.doc(id).update({ status });
  }

  async delete(id) {
    await this.collection.doc(id).delete();
  }

  async updateProposal(id, data) {
    await this.collection.doc(id).update(data);
  }

  async addFile(id, fileData) {
    await this.collection.doc(id).update({
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

    const clientRef = this.clientsCollection.doc(uid);
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

    const caseRef = this.processosCollection.doc();
    const processoData = {
      titulo: `Caso: ${data.categoria}`,
      descricao: data.resumoProblema,
      clientId: uid,
      responsavelUid: adminId,
      status: 'Em Elaboração',
      area: data.categoria,
      createdAt: FieldValue.serverTimestamp(),
      urgencia: data.urgencia,
      numeroProcesso: null,
      valorAcordado: data.proposalValue || null,
      assinatura: data.signature || null,
      anexos: [...(data.clientFiles || []), ...(data.adminFiles || [])]
    };
    batch.set(caseRef, processoData);

    const preRef = this.collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedProcessoId: caseRef.id });

    await batch.commit();

    return {
      success: true,
      tempPassword: tempPassword,
      clientId: uid,
      processoId: caseRef.id
    };
  }

  async getMovimentacoes(id) {
    const snap = await this.collection
      .doc(id)
      .collection('movimentacoes')
      .orderBy('data', 'desc')
      .get();

    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  }

  async addMovimentacao(id, data) {
    return await this.collection
      .doc(id)
      .collection('movimentacoes')
      .add(data);
  }
}

module.exports = new PreAtendimentoRepository();