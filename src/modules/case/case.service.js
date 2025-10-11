const caseRepository = require('./case.repository');
const { storage, db } = require('../../config/firebase.config'); // Adicione 'db' se não estiver lá
const { v4: uuidv4 } = require('uuid');
const { FieldValue } = require('firebase-admin/firestore');
const cloudinary = require('../../config/cloudinary.config.js');

class CaseService {
  /**
   * Cria um novo processo com os dados fornecidos e metadados essenciais.
   * @param {object} caseData - Os dados do processo vindos do formulário (título, área, etc.).
   * @param {string} userId - O ID do usuário autenticado que está criando o processo.
   * @returns {Promise<object>} O novo processo criado.
   */

  async createCase(caseData, userId) {
    const dataToSave = {
      ...caseData,
      createdBy: userId,
      createdAt: new Date(),
      documentos: [],
      movimentacoes: [],
    };

    const newCase = await caseRepository.create(dataToSave);
    return newCase;
  }

  /**
   * Busca todos os processos pertencentes a um usuário específico.
   * @param {string} userId - O ID do usuário autenticado.
   * @returns {Promise<Array>} Uma lista de processos.
   */
  async getCasesForUser(userId) {
    console.log('--- 2. Entrou no Service: getCasesForUser ---');
    const result = await caseRepository.findAllByOwner(userId);
    console.log('--- 4. Retornando do Service para o Controller ---');
    return result;
  }
  /*
    async getCaseById(caseId, userId) {
      const caseDoc = await caseRepository.findById(caseId);
      // VERIFICAÇÃO DE PERMISSÃO: O usuário pode ver este processo?
      if (!caseDoc || caseDoc.createdBy !== userId) {
        throw new Error('Processo não encontrado ou acesso não permitido.');
      }
      return caseDoc;
    }
  */

  async getCaseById(caseId, user) {
    const caseDoc = await caseRepository.findById(caseId);
    if (!caseDoc) {
      throw new Error('Processo não encontrado.');
    }
    if (user.role === 'administrador' || user.role === 'advogado') {
      return caseDoc;
    }
    if (user.role === 'cliente' && caseDoc.clientId === user.clientId) {
      return caseDoc;
    }
    throw new Error('Acesso não permitido a este processo.');
  }

  async updateCase(caseId, dataToUpdate, userId) {
    // Primeiro, busca o processo para garantir que o usuário tem permissão
    await this.getCaseById(caseId, userId);
    return await caseRepository.update(caseId, dataToUpdate);
  }

  async deleteCase(caseId, userId) {
    // Mesma verificação de permissão
    await this.getCaseById(caseId, userId);
    return await caseRepository.delete(caseId);
  }

  async uploadDocumentToCase(processoId, file, user) {
    if (!file) throw new Error('Nenhum arquivo enviado.');

    // Garante que o usuário tem permissão para modificar este processo
    await this.getCaseById(processoId, user.uid);

    const fileName = `documentos/${processoId}/${uuidv4()}-${file.originalname}`;
    const blob = storage.file(fileName);
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: file.mimetype,
      },
    });

    return new Promise((resolve, reject) => {
      blobStream.on('error', (err) => reject(err));
      blobStream.on('finish', async () => {
        const publicUrl = `https://storage.googleapis.com/${storage.name}/${blob.name}`;

        const documentRecord = {
          id: uuidv4(),
          nome: file.originalname,
          url: publicUrl,
          path: blob.name,
          tipo: file.mimetype,
          enviadoEm: new Date(),
          enviadoPor: user.uid,
        };

        // Atualiza o documento do processo, adicionando o novo registro ao array 'documentos'
        const processoRef = db.collection('processo').doc(processoId);
        await processoRef.update({
          documentos: FieldValue.arrayUnion(documentRecord)
        });

        resolve(documentRecord);
      });
      blobStream.end(file.buffer);
    });
  }

  async getCasesByClientId(clientId) {
    if (!clientId) {
      throw new Error('O ID do cliente é obrigatório.');
    }
    return await caseRepository.findAllByClientId(clientId);
  }

  async addMovimentacao(processoId, movimentacaoData, userId) {
    const dataToSave = {
      ...movimentacaoData,
      data: new Date(),
      criadoPor: userId,
    };

    return await caseRepository.addMovimentacao(processoId, dataToSave);
  }

  async getAllMovimentacoes(processoId) {
    return await caseRepository.findAllMovimentacoes(processoId);
  }

  async updateMovimentacao(processoId, movimentacaoId, movimentacaoData) {
    return await caseRepository.updateMovimentacao(processoId, movimentacaoId, movimentacaoData);
  }

  async deleteMovimentacao(processoId, movimentacaoId) {
    return await caseRepository.deleteMovimentacao(processoId, movimentacaoId);
  }

  async uploadDocumentToCase(processoId, file, user) {
    return new Promise((resolve, reject) => {
      const uploadOptions = {
        folder: `documentos/${processoId}`,
        resource_type: file.mimetype.startsWith('image/') ? 'image' : 'auto',
      };

      const stream = cloudinary.uploader.upload_stream(uploadOptions, async (error, result) => {
        if (error) {
          return reject(error);
        }

        const documentRecord = {
          id: uuidv4(),
          nome: file.originalname,
          url: result.secure_url,
          public_id: result.public_id,
          tipo: file.mimetype,
          tamanho: result.bytes,
          enviadoEm: new Date(),
          enviadoPor: user.uid,
        };

        await caseRepository.addDocument(processoId, documentRecord);
        resolve(documentRecord);
      });

      stream.end(file.buffer);
    });
  }

  async getDocumentRecord(processoId, docId, user) {
    const processo = await this.getCaseById(processoId, user);
    const documento = processo.documentos.find(doc => doc.id === docId);
    if (!documento) {
      throw new Error('Documento não encontrado neste processo.');
    }
    return documento;
  }


}

module.exports = new CaseService();