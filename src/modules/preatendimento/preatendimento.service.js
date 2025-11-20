const repository = require('./preatendimento.repository');

class PreAtendimentoService {
  async create(data) {
    return await repository.create(data);
  }

  async listAll() {
    return await repository.findAll();
  }

  async accept(id) {
    return await repository.updateStatus(id, 'Em Análise');
  }

  async reject(id) {
    return await repository.delete(id);
  }

  async convert(id, data) {
    return await repository.convertToCase(id, data);
  }

  async convert(id, data, adminId) {
    return await repository.convertToCase(id, data, adminId);
  }
}

module.exports = new PreAtendimentoService();