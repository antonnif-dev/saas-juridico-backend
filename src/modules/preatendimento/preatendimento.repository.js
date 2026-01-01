const { db, auth } = require('../../config/firebase.config');
const { FieldValue } = require('firebase-admin/firestore');

const collection = db.collection('preatendimentos');
const clientsCollection = db.collection('clients');
const processosCollection = db.collection('processo');

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

  async findAllByClientId(clientId) {
    const snapshot = await collection.where('clientId', '==', clientId).orderBy('createdAt', 'desc').get();
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
    let uid = data.clientId; // ID vindo do frontend (vínculo manual ou cliente logado)
    let tempPassword = null;

    // 1. Lógica de Identificação de Usuário
    if (!uid) {
      // Se não temos UID, tentamos criar ou buscar por e-mail
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
          // IMPORTANTE: Não resetamos a senha aqui para não deslogar um cliente ativo
          tempPassword = "Utilize sua senha já cadastrada.";
        } else {
          throw error;
        }
      }
    }

    const batch = db.batch();

    // 2. Cliente (Usa merge: true para não sobrescrever dados antigos do cliente)
    const clientRef = clientsCollection.doc(uid);
    const clientData = {
      name: data.nome,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.telefone,
      address: data.endereco,
      status: 'ativo',
      updatedAt: FieldValue.serverTimestamp(), // Mudamos para updatedAt se já existir
      convertedFrom: FieldValue.arrayUnion(id) // Registra que este pré-atendimento gerou um caso
    };
    batch.set(clientRef, clientData, { merge: true });

    // 3. Processo (Mantém sua lógica, mas garante o clientId correto)
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

    // 4. Atualiza status do Pré-Atendimento
    const preRef = collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedProcessoId: caseRef.id });

    await batch.commit();

    return {
      success: true,
      tempPassword: tempPassword, // Retornará null ou o aviso se for cliente antigo
      clientId: uid,
      processoId: caseRef.id
    };
  }
}

module.exports = new PreAtendimentoRepository();