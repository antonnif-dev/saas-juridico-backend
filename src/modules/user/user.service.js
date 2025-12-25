//const { auth, db } = require('../../config/firebase.config');
const { auth } = require('../../config/firebase.config');
const userRepository = require('./user.repository');

class UserService {

  /**
   * HELPER: Normaliza o objeto de endereço
   */
  _cleanAddress(addr) {
    if (!addr) return null;
    return {
      cep: addr.cep || '',
      rua: addr.rua || '',
      numero: addr.numero || '',
      complemento: addr.complemento || '',
      bairro: addr.bairro || '',
      cidade: addr.cidade || '',
      estado: addr.estado || ''
    };
  }

  /**
   * CRIAÇÃO DE ADVOGADO (Admin)
   */
  async createAdvogado(userData) {
    const { name, email, password, oab, dataNascimento, estadoCivil, phone, endereco } = userData;

    // 1. Criação no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Define o papel (role) nas Custom Claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'advogado' });

    // 3. Persistência no Firestore via Repository
    const firestoreData = {
      name,
      email,
      role: 'advogado',
      status: 'ativo',
      createdAt: new Date(),
      cpfCnpj: '',
      phone: phone || '',
      oab: oab || '',
      dataNascimento: dataNascimento || '',
      estadoCivil: estadoCivil || '',
      tipoPessoa: 'Física',
      endereco: this._cleanAddress(endereco)
    };

    await userRepository.update(userRecord.uid, firestoreData);

    return { uid: userRecord.uid, email, name, role: 'advogado' };
  }

  /**
   * BUSCA DO PRÓPRIO PERFIL (Híbrido: Auth + DB)
   */
  async getMe(uid) {
    const userRecord = await auth.getUser(uid);
    const userData = await userRepository.findById(uid);

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      photoUrl: userData?.photoUrl || userRecord.photoURL || null,
      role: userRecord.customClaims?.role || 'indefinido',
      cpfCnpj: userData?.cpfCnpj || '',
      tipoPessoa: userData?.tipoPessoa || 'Física',
      phone: userData?.phone || '',
      oab: userData?.oab || '',
      dataNascimento: userData?.dataNascimento || '',
      estadoCivil: userData?.estadoCivil || '',
      endereco: userData?.endereco || this._cleanAddress(null)
    };
  }

  /**
   * ATUALIZAÇÃO DO PRÓPRIO PERFIL (Self)
   */
  async updateMe(uid, data) {
    const { name, email, password, ...profileFields } = data;

    // 1. Atualização no Firebase Auth
    const authUpdates = {};
    if (name) authUpdates.displayName = name;
    if (email) authUpdates.email = email;
    if (password && password.trim().length >= 6) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(uid, authUpdates);
    }

    // 2. Atualização no Firestore via Repository
    const dbUpdates = { ...profileFields, updatedAt: new Date() };

    if (name) dbUpdates.name = name;
    if (email) dbUpdates.email = email;
    if (profileFields.endereco) {
      dbUpdates.endereco = this._cleanAddress(profileFields.endereco);
    }

    // Remove campos indefinidos para evitar erros de escrita
    Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

    await userRepository.update(uid, dbUpdates);

    return { uid, ...dbUpdates };
  }

  /**
   * ATUALIZAÇÃO DE ADVOGADO (Admin)
   */
  async updateAdvogado(userId, data) {
    // Reutiliza a lógica de atualização, mas foca na coleção de usuários
    return this.updateMe(userId, data);
  }

  /**
   * LISTAGEM DE ADVOGADOS (Utiliza Claims para precisão)
   */
  async listAdvogados() {
    // Podemos listar via Auth para garantir quem tem a Claim, 
    // ou via Firestore Repository. Aqui mantemos a precisão do Auth:
    const listUsersResult = await auth.listUsers(1000);
    return listUsersResult.users
      .filter(user => user.customClaims && user.customClaims.role === 'advogado')
      .map(u => ({ uid: u.uid, email: u.email, name: u.displayName }));
  }

  /**
   * EXCLUSÃO DE USUÁRIO
   */
  async deleteAdvogado(userId) {
    await auth.deleteUser(userId);
    await userRepository.delete(userId);
    return { message: 'Usuário removido com sucesso de todas as bases.' };
  }

  /**
   * UPLOAD DE FOTO DE PERFIL
   */
  async uploadProfilePhoto(userId, file) {
    const cloudinary = require('../../config/cloudinary.config');
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `users/${userId}/profile`,
          public_id: 'avatar',
          overwrite: true,
          transformation: [{ width: 500, height: 500, crop: "fill" }]
        },
        async (error, result) => {
          if (error) return reject(error);
          await auth.updateUser(userId, { photoURL: result.secure_url });

          // Sincroniza a URL da foto no Firestore também
          await userRepository.update(userId, { photoUrl: result.secure_url });

          resolve({ photoUrl: result.secure_url });
        }
      );
      uploadStream.end(file.buffer);
    });
  }

  async createUserWithRole(userData, role) {
    const { name, email, password, ...otherFields } = userData;

    // 1. Criação no Firebase Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Define a Claim IMUTÁVEL no Token (Hierarquia real)
    await auth.setCustomUserClaims(userRecord.uid, { role: role });

    // 3. Persistência no Firestore
    const firestoreData = {
      ...otherFields,
      name,
      email,
      role: role,
      status: 'ativo',
      createdAt: new Date(),
      endereco: this._cleanAddress(userData.endereco)
    };

    await userRepository.update(userRecord.uid, firestoreData);
    return { uid: userRecord.uid, email, role };
  }
}

module.exports = new UserService();