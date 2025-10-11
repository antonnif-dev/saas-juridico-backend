const { auth } = require('../../config/firebase.config');

class UserService {
  /**
   * Atribui um perfil (role) a um usuário específico.
   * @param {string} uid - O ID do usuário a ser modificado.
   * @param {string} role - O perfil a ser atribuído (ex: 'advogado', 'administrador').
   * @returns {Promise<void>}
   */
  async setUserRole(uid, role) {
    // Validações adicionais podem ser feitas aqui (ex: se o role é válido)
    await auth.setCustomUserClaims(uid, { role: role });
    console.log(`Perfil '${role}' atribuído ao usuário ${uid}`);
    // É uma boa prática retornar algo para confirmar a operação
    return { message: `Perfil '${role}' atribuído com sucesso.` };
  }
}

module.exports = new UserService();