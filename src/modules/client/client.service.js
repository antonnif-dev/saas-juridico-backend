const { auth, db } = require('../../config/firebase.config');
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
    const clients = await clientRepository.findAll();

    const enrichedClients = await Promise.all(clients.map(async (client) => {
      if (!client.authUid) return client;

      try {
        const userDoc = await db.collection('users').doc(client.authUid).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          return {
            ...client,
            photoUrl: userData.photoUrl || userData.photoURL || null
          };
        }
      } catch (error) {
      }
      return client;
    }));

    return enrichedClients;
  }

  async getClientById(clientId) {
    const client = await clientRepository.findById(clientId);
    if (!client) {
      throw new Error('Cliente não encontrado.');
    }
    return client;
  }

  async getClientByAuthUid(authUid) {
    return await clientRepository.findByAuthUid(authUid);
  }

  async findByEmail(email) {
    return await clientRepository.findByEmail(email);
  }

  async updateClient(clientId, dataToUpdate) {
    return await clientRepository.update(clientId, dataToUpdate);
  }

  async updateClientByAuthUid(authUid, dataToUpdate) {
    const clean = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(clean);
      return Object.fromEntries(
        Object.entries(obj)
          .filter(([_, v]) => v !== undefined)
          .map(([k, v]) => [k, clean(v)])
      );
    };

    const client = await clientRepository.findByAuthUid(authUid);
    if (!client) throw new Error('Cliente não encontrado.');

    const payload = clean({
      ...dataToUpdate,
      updatedAt: new Date(),
    });

    if (payload.address && !payload.endereco) {
      payload.endereco = payload.address;
      delete payload.address;
    }

    delete payload.authUid;

    return await clientRepository.update(client.id, payload);
  }

  async deleteClient(clientId) {
    return await clientRepository.delete(clientId);
  }
}

module.exports = new ClientService();