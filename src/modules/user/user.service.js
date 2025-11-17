const { auth } = require('../../config/firebase.config');

class UserService {
  /**
   * Atribui um perfil (role) a um usuário específico.
   * @param {string} uid - O ID do usuário a ser modificado.
   * @param {string} role - O perfil a ser atribuído (ex: 'advogado', 'administrador').
   * @returns {Promise<void>}
   */
  async setUserRole(uid, role) {
    await auth.setCustomUserClaims(uid, { role: role });
    console.log(`Perfil '${role}' atribuído ao usuário ${uid}`);
    return { message: `Perfil '${role}' atribuído com sucesso.` };
  }

  async createAdvogado(userData) {
    const { name, email, password } = userData;
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: 'advogado' });
    const cleanUser = {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      role: 'advogado'
    };
    return cleanUser;
  }
  
  async updateUser(uid, updates) {
    const userRecord = await auth.updateUser(uid, {
      displayName: updates.name,
      email: updates.email,
      password: updates.password,
    });

    // Atualiza Firestore também, se existir
    if (db) {
      await db.collection('users').doc(uid).update({
        name: updates.name ?? userRecord.displayName,
        email: updates.email ?? userRecord.email,
      });
    }

    return {
      uid: userRecord.uid,
      name: userRecord.displayName,
      email: userRecord.email,
    };
  }
}

module.exports = new UserService();