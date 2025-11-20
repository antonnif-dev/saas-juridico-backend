const { db, auth } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');

const collection = db.collection('preatendimentos');
const clientsCollection = db.collection('clients');
const casesCollection = db.collection('processo');

class PreAtendimentoRepository {
  async create(data) {
    const docRef = await collection.add({
      ...data,
      status: 'Pendente',
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

  // Método para salvar a proposta ou anotações
  async updateProposal(id, data) {
    await collection.doc(id).update(data);
  }

  // Método para adicionar arquivo (upload)
  async addFile(id, fileData) {
    await collection.doc(id).update({
      adminFiles: FieldValue.arrayUnion(fileData)
    });
    return fileData;
  }

  // Método de Conversão
  async convertToCase(id, data, adminId) {
    // 1. Gera senha
    const tempPassword = Math.random().toString(36).slice(-8) + "Aa1@";
    let uid;

    // 2. Cria ou busca usuário
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
      } else {
        throw error;
      }
    }

    const batch = db.batch();

    // 3. Cliente
    const clientRef = clientsCollection.doc(uid);
    const clientData = {
      name: data.nome, email: data.email, cpfCnpj: data.cpfCnpj,
      phone: data.telefone, address: data.endereco, status: 'ativo',
      createdAt: new Date(), convertedFrom: id
    };
    batch.set(clientRef, clientData, { merge: true });

    // 4. Processo
    const caseRef = casesCollection.doc();
    const caseData = {
      titulo: `Caso: ${data.categoria}`,
      descricao: data.resumoProblema,
      clientId: uid,
      responsavelUid: adminId,
      status: 'Em andamento',
      area: data.categoria,
      createdAt: new Date(),
      urgencia: data.urgencia,
      numeroProcesso: 'Aguardando Distribuição',
      // Copia dados da negociação se existirem
      valorAcordado: data.proposalValue || null,
      assinatura: data.signature || null,
      anexos: [...(data.clientFiles || []), ...(data.adminFiles || [])]
    };
    batch.set(caseRef, caseData);

    // 5. Atualiza status
    const preRef = collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedCaseId: caseRef.id });

    await batch.commit();

    return { 
      success: true, 
      tempPassword: tempPassword,
      clientId: uid,
      caseId: caseRef.id
    };
  }
}

module.exports = new PreAtendimentoRepository();

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