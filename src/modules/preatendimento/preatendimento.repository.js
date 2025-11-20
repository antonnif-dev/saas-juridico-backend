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

  async acceptAndCreateClient(id, data) {
    // 1. Gera senha
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1@";
    let uid;

    // 2. Cria Usuário no Auth
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
         // Atualiza senha para garantir acesso
         await auth.updateUser(uid, { password: tempPassword });
      } else { throw error; }
    }

    const batch = db.batch();

    // 3. Cria o Cliente no Firestore
    const clientRef = clientsCollection.doc(uid);
    batch.set(clientRef, {
      name: data.nome, email: data.email, cpfCnpj: data.cpfCnpj,
      phone: data.telefone, address: data.endereco, status: 'ativo',
      createdAt: new Date(), convertedFrom: id
    }, { merge: true });

    // 4. Atualiza o Pré-atendimento
    const preRef = collection.doc(id);
    batch.update(preRef, { 
      status: 'Em Negociacao', 
      clientId: uid, // Vincula o cliente criado ao pré-atendimento
      proposalValue: null, // Campo para o valor
      proposalStatus: 'pending', // pending, sent, accepted, rejected
      clientFiles: [],
      adminFiles: []
    });

    await batch.commit();

    return { tempPassword, clientId: uid };
  }

  // Novo método para salvar proposta/negociação
  async updateProposal(id, data) {
    await collection.doc(id).update(data);
  }

  // Método Finalizar (Antigo convertToCase, agora simplificado)
  async finalizeCase(id, preData, adminId) {
    // Cria apenas o processo, pois o cliente já existe
    const caseRef = casesCollection.doc();
    await caseRef.set({
      titulo: `Caso: ${preData.categoria}`,
      descricao: preData.resumoProblema,
      clientId: preData.clientId, // Já existe
      responsavelUid: adminId,
      status: 'Em andamento',
      area: preData.categoria,
      createdAt: new Date(),
      urgencia: preData.urgencia,
      numeroProcesso: 'Aguardando',
      // Copia os arquivos da negociação para o processo final
      anexos: [...(preData.clientFiles || []), ...(preData.adminFiles || [])],
      valorAcordado: preData.proposalValue,
      assinatura: preData.signature
    });

    await collection.doc(id).update({ status: 'Convertido', relatedCaseId: caseRef.id });
    return { caseId: caseRef.id };
  }

  async delete(id) {
    await collection.doc(id).delete();
  }
/*
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
        await auth.updateUser(uid, {
          password: tempPassword,
          displayName: data.nome
        });
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
*/

}

module.exports = new PreAtendimentoRepository();