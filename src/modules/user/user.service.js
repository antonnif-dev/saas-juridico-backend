const { auth } = require('../../config/firebase.config');
const usersCollection = db.collection('users');

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

  async getMe(uid) {
    const userRecord = await auth.getUser(uid);    
    let doc = await usersCollection.doc(uid).get();    
    if (!doc.exists) {
      const clientsCollection = db.collection('clients');
      doc = await clientsCollection.doc(uid).get();
    }
    const firestoreData = doc.exists ? doc.data() : {};
    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      photoUrl: userRecord.photoURL,
      role: userRecord.customClaims?.role,
      cpfCnpj: firestoreData.cpfCnpj || '',
      tipoPessoa: firestoreData.tipoPessoa || 'Física',
      phone: firestoreData.phone || ''
    };
  }

  async updateMe(uid, data) {
    const { name, email, password, cpfCnpj, tipoPessoa, phone } = data;
    const updateData = {};
    if (name) updateData.displayName = name;
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    
    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData);
    }

    const userRecord = await auth.getUser(uid);
    const isClient = userRecord.customClaims?.role === 'cliente';    
    const collectionTarget = isClient ? db.collection('clients') : usersCollection;
    const firestoreData = {
      updatedAt: new Date()
    };
    if (cpfCnpj) firestoreData.cpfCnpj = cpfCnpj;
    if (tipoPessoa) firestoreData.tipoPessoa = tipoPessoa;
    if (phone) firestoreData.phone = phone;
    if (name) firestoreData.name = name; 
    if (email) firestoreData.email = email;

    await collectionTarget.doc(uid).set(firestoreData, { merge: true });

    return { uid, ...data };
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

  async uploadProfilePhoto(userId, file) {
    const cloudinary = require('../../config/cloudinary.config');

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `users/${userId}/profile`,
          public_id: 'avatar',
          overwrite: true,
          transformation: [{ width: 500, height: 500, crop: "fill" }] // Padroniza tamanho
        },
        async (error, result) => {
          if (error) return reject(error);

          // Atualiza a URL no Firebase Auth para aparecer no currentUser do frontend
          await auth.updateUser(userId, { photoURL: result.secure_url });

          resolve({ photoUrl: result.secure_url });
        }
      );
      uploadStream.end(file.buffer);
    });
  }
}

module.exports = new UserService();