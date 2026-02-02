const repository = require('./preatendimento.repository');
const cloudinary = require('../../config/cloudinary.config');
const clientService = require('../client/client.service');

class PreAtendimentoService {
  async create(data, user = null) {
    let clientId = data?.clientId || null;

    if (user?.role === 'cliente') {
      clientId = user.uid;
    }

    if (!clientId && data?.email) {
      const client = await clientService.findByEmail(data.email);
      if (client?.authUid) clientId = client.authUid;
    }

    const payload = {
      nome: data?.nome ?? '',
      cpfCnpj: data?.cpfCnpj ?? '',
      tipoPessoa: data?.tipoPessoa ?? 'Física',
      dataNascimento: data?.dataNascimento ?? '',
      estadoCivil: data?.estadoCivil ?? '',
      email: data?.email ?? '',
      telefone: data?.telefone ?? '',
      profissao: data?.profissao ?? '',
      nomeMae: data?.nomeMae ?? '',

      endereco: {
        cep: data?.endereco?.cep ?? '',
        rua: data?.endereco?.rua ?? '',
        numero: data?.endereco?.numero ?? '',
        complemento: data?.endereco?.complemento ?? '',
        bairro: data?.endereco?.bairro ?? '',
        cidade: data?.endereco?.cidade ?? '',
        estado: data?.endereco?.estado ?? '',
      },

      categoria: data?.categoria ?? '',
      resumoProblema: data?.resumoProblema ?? '',
      dataProblema: data?.dataProblema ?? '',
      problemaContinuo: !!data?.problemaContinuo,
      parteContrariaNome: data?.parteContrariaNome ?? '',
      tipoRelacao: data?.tipoRelacao ?? '',
      documentos: Array.isArray(data?.documentos) ? data.documentos : [],
      objetivo: data?.objetivo ?? '',
      urgencia: data?.urgencia ?? 'Média',
      triagem: (data?.triagem && typeof data.triagem === 'object') ? data.triagem : {},
      informacaoExtra: data?.informacaoExtra ?? '',

      mensagem: (typeof data?.mensagem === 'string') ? data.mensagem : '',

      consentimentoLGPD: !!data?.consentimentoLGPD,
      consentimentoWhatsapp: !!data?.consentimentoWhatsapp,
      consentimentoCadastro: !!data?.consentimentoCadastro,

      clientId: clientId || null,
      createdByUid: user?.uid || null,
      origem: user ? 'interno' : 'publico',
      status: 'Pendente',
      createdAt: new Date(),
    };

    const stripUndefined = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      Object.keys(obj).forEach((k) => {
        if (obj[k] === undefined) delete obj[k];
        else if (typeof obj[k] === 'object' && obj[k] !== null) stripUndefined(obj[k]);
      });
      return obj;
    };

    stripUndefined(payload);
    return await repository.create(payload, user);
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

  async getById(id) {
    if (!id) throw new Error('ID do pré-atendimento é obrigatório.');
    return await repository.findById(id);
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

  async update(id, data, user) {
    if (!user || (user.role !== 'administrador' && user.role !== 'advogado')) {
      throw new Error('Acesso negado.');
    }

    const patch = {
      nome: data?.nome ?? '',
      cpfCnpj: data?.cpfCnpj ?? '',
      tipoPessoa: data?.tipoPessoa ?? 'Física',
      dataNascimento: data?.dataNascimento ?? '',
      estadoCivil: data?.estadoCivil ?? '',
      email: data?.email ?? '',
      telefone: data?.telefone ?? '',
      profissao: data?.profissao ?? '',
      nomeMae: data?.nomeMae ?? '',

      endereco: {
        cep: data?.endereco?.cep ?? '',
        rua: data?.endereco?.rua ?? '',
        numero: data?.endereco?.numero ?? '',
        complemento: data?.endereco?.complemento ?? '',
        bairro: data?.endereco?.bairro ?? '',
        cidade: data?.endereco?.cidade ?? '',
        estado: data?.endereco?.estado ?? '',
      },

      // caso
      categoria: data?.categoria ?? '',
      resumoProblema: data?.resumoProblema ?? '',
      dataProblema: data?.dataProblema ?? '',
      problemaContinuo: !!data?.problemaContinuo,
      parteContrariaNome: data?.parteContrariaNome ?? '',
      tipoRelacao: data?.tipoRelacao ?? '',
      documentos: Array.isArray(data?.documentos) ? data.documentos : [],
      objetivo: data?.objetivo ?? '',
      urgencia: data?.urgencia ?? 'Média',
      triagem: (data?.triagem && typeof data.triagem === 'object') ? data.triagem : {},
      informacaoExtra: data?.informacaoExtra ?? '',

      proposalValue: data?.proposalValue ?? null,
      proposalStatus: data?.proposalStatus ?? '',
      adminNotes: data?.adminNotes ?? '',

      updatedAt: new Date(),
    };

    const stripUndefined = (obj) => {
      if (!obj || typeof obj !== 'object') return obj;
      Object.keys(obj).forEach((k) => {
        if (obj[k] === undefined) delete obj[k];
        else if (typeof obj[k] === 'object' && obj[k] !== null) stripUndefined(obj[k]);
      });
      return obj;
    };
    stripUndefined(patch);

    return await repository.update(id, patch);
  }
}
module.exports = new PreAtendimentoService();