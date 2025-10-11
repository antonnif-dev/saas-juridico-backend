const { auth } = require('../../config/firebase.config');
const clientRepository = require('./client.repository');

class ClientService {
  async createClient(fullClientData) {
    const { name, email, phone, type, password } = fullClientData;

    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    const clientDataForFirestore = {
      name,
      email,
      phone,
      type,
      authUid: userRecord.uid,
      createdAt: new Date(),
      status: 'ativo'
    };

    const newClientDocument = await clientRepository.create(clientDataForFirestore);

    await auth.setCustomUserClaims(userRecord.uid, { 
      role: 'cliente', 
      clientId: newClientDocument.id 
    });

    return newClientDocument;
  }

  async getAllClients() {
    return await clientRepository.findAll();
  }

  async getClientById(clientId) {
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new Error('Cliente não encontrado.');
    }
    return client;
  }

  async updateClient(clientId, dataToUpdate) {
    return await clientRepository.update(clientId, dataToUpdate);
  }

  async deleteClient(clientId) {
    return await clientRepository.delete(clientId);
  }
}

module.exports = new ClientService();