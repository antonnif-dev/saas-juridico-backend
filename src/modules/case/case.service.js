const processoRepository = require('./case.repository');
const { storage, db } = require('../../config/firebase.config'); // Adicione 'db' se não estiver lá
const { v4: uuidv4 } = require('uuid');
const { FieldValue } = require('firebase-admin/firestore');
const cloudinary = require('../../config/cloudinary.config.js');

class ProcessoService {
  /**
   * Cria um novo processo com os dados fornecidos e metadados essenciais.
   * @param {object} processoData - Os dados do processo vindos do formulário (título, área, etc.).
   * @param {string} userId - O ID do usuário autenticado que está criando o processo.
   * @returns {Promise<object>} O novo processo criado.
   */

  async createProcesso(processoData, userId) { // <-- NOME DO MÉTODO CORRIGIDO
    const dataToSave = {
      ...processoData,
      createdBy: userId,
      responsavelUid: userId,
      createdAt: new Date(),
      documentos: [],
      movimentacoes: [],
      status: processoData.status || 'Em andamento',
      urgencia: processoData.urgencia || 'Média'
    };
    return await processoRepository.create(dataToSave);
  }

  /**
   * Busca todos os processos pertencentes a um usuário específico.
   * @param {string} userId - O ID do usuário autenticado.
   * @returns {Promise<Array>} Uma lista de processos.
   */
  async getCasesForUser(userId) {
    const result = await processoRepository.findAllByOwner(userId);
    return result;
  }

  async listItemsForUser(userId) {
    return this.getCasesForUser(userId);
  }

  async getProcessoById(processoId, user) {
    const processoDoc = await processoRepository.findById(processoId);
    if (!processoDoc) {
      throw new Error('Processo não encontrado.');
    }
    const userData = typeof user === 'string' ? { uid: user, role: 'advogado' } : user;
    if (userData.role === 'administrador' || userData.role === 'advogado') {
      const isOwner = (processoDoc.responsavelUid === userData.uid) || (processoDoc.createdBy === userData.uid);
      return processoDoc;
    }
    if (userData.role === 'cliente' && processoDoc.clientId === userData.clientId) {
      return processoDoc;
    }
    throw new Error('Acesso não permitido a este processo.');
  }

  async updateProcesso(processoId, dataToUpdate, userId) {
    console.log("DADOS RECEBIDOS:", JSON.stringify(dataToUpdate));
    await this.getProcessoById(processoId, userId);
    return await processoRepository.update(processoId, dataToUpdate);
  }

  async updateItem(processoId, data, userId) {
    return this.updateProcesso(processoId, data, userId);
  }

  async deleteItem(processoId, userId) {
    return this.deleteProcesso(processoId, userId);
  }

  async deleteProcesso(processoId, userId) {
    await this.getProcessoById(processoId, userId);
    return processoRepository.delete(processoId);
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
    return await processoRepository.findAllByClientId(clientId);
  }

  async addMovimentacao(processoId, movimentacaoData, userId) {
    const dataToSave = {
      ...movimentacaoData,
      data: new Date(),
      criadoPor: userId,
    };

    return await processoRepository.addMovimentacao(processoId, dataToSave);
  }

  async getAllMovimentacoes(processoId) {
    return await processoRepository.findAllMovimentacoes(processoId);
  }

  async updateMovimentacao(processoId, movimentacaoId, movimentacaoData) {
    return await processoRepository.updateMovimentacao(processoId, movimentacaoId, movimentacaoData);
  }

  async deleteMovimentacao(processoId, movimentacaoId) {
    return await processoRepository.deleteMovimentacao(processoId, movimentacaoId);
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

        await processoRepository.addDocument(processoId, documentRecord);
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

  // O controller chama 'listItemsForUser' (mantém o nome), mas ele chama o seu getCasesForUser
  async listItemsForUser(userId) {
    return this.getCasesForUser(userId);
  }
}

module.exports = new ProcessoService();