const repository = require('./preatendimento.repository');
const cloudinary = require('../../config/cloudinary.config');
const clientService = require('../client/client.service');

class PreAtendimentoService {
  async create(data, user = null) {
    const { nome, email, telefone, cpfCnpj, mensagem, clientId: clientIdFromBody } = data;

    let clientId = clientIdFromBody;

    if (!clientId) {
      if (!email) {
        throw new Error('Email é obrigatório para criar pré-atendimento público.');
      }

      const client = await clientService.findByEmail(email);

      if (!client) {
        const newClient = await clientService.create({ nome, email, telefone, cpfCnpj });
        clientId = newClient.uid;
      } else {
        clientId = client.uid;
      }
    }
    // return preAtendimentoRepository.create({
    return repository.create({
      nome,
      email,
      telefone,
      cpfCnpj,
      mensagem,
      clientId,
      createdByUid: user?.uid || null,
      origem: user ? 'interno' : 'publico',
      status: 'pendente',
      createdAt: new Date()
    });
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

  async delete(id) {
    return await repository.delete(id);
  }

  async reject(id) {
    return await repository.delete(id);
  }

  async convert(id, data, adminId) {
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

  async getMovimentacoes(id) {
    return await repository.getMovimentacoes(id);
  }

  async addMovimentacao(id, data) {
    return await repository.addMovimentacao(id, {
      ...data,
      data: new Date(),
    });
  }
}
module.exports = new PreAtendimentoService();