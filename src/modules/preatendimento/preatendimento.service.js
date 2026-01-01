const repository = require('./preatendimento.repository');

class PreAtendimentoService {
  async create(data) {
    return await repository.create(data);
  }

  async listAll() {
    return await repository.findAll();
  }

  async list(user) {
    if (user.role === 'cliente') {
      return await repository.findAllByClientId(user.uid);
    }
    return await repository.findAll();
  }

  async accept(id) {
    return await repository.updateStatus(id, 'Em Negociacao');
  }

  async reject(id) {
    return await repository.delete(id);
  }

  async convert(id, data) {
    return await repository.convertToCase(id, data);
  }

  async convert(id, data, adminId) {
    let existingClientId = data.clientId;

    if (!existingClientId && data.email) {
      const clientRepo = require('../clientes/client.repository'); // ajuste o caminho
      const existingClient = await clientRepo.findByEmail(data.email);
      if (existingClient) existingClientId = existingClient.id;
    }

    return await repository.convertToCase(id, data, adminId);
  }

  async acceptAndCreateClient(id, data) {
    return await repository.acceptAndCreateClient(id, data);
  }

  async updateProposal(id, data) {
    return await repository.updateProposal(id, data);
  }

  async finalizeCase(id, preData, adminId) {
    return await repository.finalizeCase(id, preData, adminId);
  }

  async uploadFile(id, file) {
    const cloudinary = require('../../config/cloudinary.config');
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: `preatendimentos/${id}`, resource_type: 'auto' },
        async (error, result) => {
          if (error) return reject(error);
          const fileData = {
            url: result.secure_url,
            nome: file.originalname,
            tipo: file.mimetype
          };
          await repository.addFile(id, fileData);
          resolve(fileData);
        }
      );
      uploadStream.end(file.buffer);
    });
  }
}

module.exports = new PreAtendimentoService();