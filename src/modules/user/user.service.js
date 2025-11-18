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

  async listAdvogados() {
    const listUsersResult = await auth.listUsers(1000);

    const advogados = listUsersResult.users
      .filter(user => user.customClaims && user.customClaims.role === 'advogado')
      .map(user => {
        return {
          uid: user.uid,
          email: user.email,
          name: user.displayName,
        };
      });

    return advogados;
  }
  async updateAdvogado(userId, dataToUpdate) {
    const { name, email } = dataToUpdate;

    const updatedUser = await auth.updateUser(userId, {
      displayName: name,
      email: email,
    });

    return {
      uid: updatedUser.uid,
      email: updatedUser.email,
      name: updatedUser.displayName,
    };
  }
  async deleteAdvogado(userId) {
    await auth.deleteUser(userId);
    return { message: 'Usuário deletado com sucesso.' };
  }
}

module.exports = new UserService();