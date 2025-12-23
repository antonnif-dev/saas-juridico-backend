const { db } = require('../../config/firebase.config');

class UserRepository {
  constructor() {
    this.collection = db.collection('users');
  }

  /**
   * Busca um usuário pelo UID
   * @param {string} uid 
   */
  async findById(uid) {
    try {
      const doc = await this.collection.doc(uid).get();
      if (!doc.exists) return null;
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error(`Erro ao buscar usuário ${uid}:`, error);
      throw error;
    }
  }

  /**
   * Atualiza os dados do usuário com suporte a objetos aninhados (ex: endereço)
   * @param {string} uid 
   * @param {Object} data 
   */
  async update(uid, data) {
    try {
      const userRef = this.collection.doc(uid);
      
      // Utilizamos { merge: true } para garantir que campos não enviados 
      // (como a foto, se não alterada) permaneçam intactos.
      await userRef.set(data, { merge: true });
      
      return { uid, ...data };
    } catch (error) {
      console.error(`Erro ao atualizar usuário ${uid} no Firestore:`, error);
      throw error;
    }
  }

  /**
   * Lista todos os usuários com o papel de Advogado
   */
  async listByRole(role = 'Advogado') {
    try {
      const snapshot = await this.collection.where('role', '==', role).get();
      const users = [];
      snapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
      return users;
    } catch (error) {
      console.error("Erro ao listar advogados:", error);
      throw error;
    }
  }

  /**
   * Remove o documento do usuário do Firestore
   * @param {string} uid 
   */
  async delete(uid) {
    try {
      await this.collection.doc(uid).delete();
      return true;
    } catch (error) {
      console.error(`Erro ao deletar usuário ${uid}:`, error);
      throw error;
    }
  }
}

module.exports = new UserRepository();