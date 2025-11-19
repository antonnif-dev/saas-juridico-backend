const { db } = require('../../config/firebase.config');
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

  // A Mágica: Transforma os dados em Cliente e Processo
  async convertToCase(id, data) {
    const batch = db.batch();

    // 1. Cria o Cliente
    const clientRef = clientsCollection.doc();
    const clientData = {
      name: data.nome,
      email: data.email,
      cpfCnpj: data.cpfCnpj,
      phone: data.telefone,
      address: data.endereco,
      createdAt: new Date(),
      convertedFrom: id
    };
    batch.set(clientRef, clientData);

    // 2. Cria o Processo vinculado ao Cliente
    const caseRef = casesCollection.doc();
    const caseData = {
      titulo: `Caso: ${data.categoria}`,
      descricao: data.resumoProblema,
      clientId: clientRef.id, // Vincula ao novo cliente
      status: 'Em andamento',
      area: data.categoria,
      createdAt: new Date(),
      urgencia: data.urgencia
    };
    batch.set(caseRef, caseData);

    // 3. Atualiza o Pré-atendimento para 'Convertido' (ou deleta, se preferir)
    const preRef = collection.doc(id);
    batch.update(preRef, { status: 'Convertido', relatedCaseId: caseRef.id });

    await batch.commit();
    return { clientId: clientRef.id, caseId: caseRef.id };
  }
}

module.exports = new PreAtendimentoRepository();