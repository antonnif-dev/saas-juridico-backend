const { auth, db } = require('../../config/firebase.config');

class UserService {

  // --- HELPER: Limpa campos undefined do endereço para não quebrar o Firestore ---
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
    const { name, email, password, oab, dataNascimento, estadoCivil, telefone, endereco } = userData;

    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    await auth.setCustomUserClaims(userRecord.uid, { role: 'advogado' });

    // Salva no Firestore (Coleção 'users')
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'advogado', // Aqui definimos a distinção
      status: 'ativo',
      createdAt: new Date(),
      cpfCnpj: '',
      phone: telefone || '',
      oab: oab || '',
      dataNascimento: dataNascimento || '',
      estadoCivil: estadoCivil || '',
      tipoPessoa: 'Física',
      endereco: this._cleanAddress(endereco) // Usa o helper para limpar
    });

    return { uid: userRecord.uid, email, name, role: 'advogado' };
  }

  /**
   * BUSCA DO PRÓPRIO PERFIL
   */
  async getMe(uid) {
    const userRecord = await auth.getUser(uid);
    
    // 1. Tenta buscar em 'users' (Equipe: Admin/Advogado)
    let doc = await db.collection('users').doc(uid).get();
    
    // 2. Se não achar, tenta em 'clients' (Clientes)
    if (!doc.exists) {
      doc = await db.collection('clients').doc(uid).get();
    }

    const data = doc.exists ? doc.data() : {};

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      photoUrl: userRecord.photoURL,
      role: userRecord.customClaims?.role || 'indefinido', // Proteção contra role vazia
      cpfCnpj: data.cpfCnpj || '',
      tipoPessoa: data.tipoPessoa || 'Física',
      phone: data.phone || '',
      oab: data.oab || '',
      dataNascimento: data.dataNascimento || '',
      estadoCivil: data.estadoCivil || '',
      endereco: data.endereco || { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" }
    };
  }

  /**
   * ATUALIZAÇÃO DO PRÓPRIO PERFIL
   */
  async updateMe(uid, data) {
    try {
      const { name, email, password, cpfCnpj, tipoPessoa, phone, oab, dataNascimento, estadoCivil, endereco } = data;

      // 1. Auth
      const userRecord = await auth.getUser(uid);
      const updateData = {};
      if (name) updateData.displayName = name;
      if (email && email !== userRecord.email) updateData.email = email;
      if (password && password.trim().length >= 6) updateData.password = password;

      if (Object.keys(updateData).length > 0) {
        await auth.updateUser(uid, updateData);
      }

      // 2. Firestore
      const isClient = userRecord.customClaims?.role === 'cliente';
      const collectionName = isClient ? 'clients' : 'users';
      
      // Monta o objeto de dados manualmente para evitar 'undefined'
      const firestoreData = { updatedAt: new Date() };

      if (name) firestoreData.name = name;
      if (email) firestoreData.email = email;
      if (cpfCnpj !== undefined) firestoreData.cpfCnpj = cpfCnpj;
      if (tipoPessoa !== undefined) firestoreData.tipoPessoa = tipoPessoa;
      if (phone !== undefined) firestoreData.phone = phone;
      if (oab !== undefined) firestoreData.oab = oab;
      if (dataNascimento !== undefined) firestoreData.dataNascimento = dataNascimento;
      if (estadoCivil !== undefined) firestoreData.estadoCivil = estadoCivil;
      
      // Limpeza crítica do endereço
      if (endereco) {
        firestoreData.endereco = this._cleanAddress(endereco);
      }

      // Salva com merge
      await db.collection(collectionName).doc(uid).set(firestoreData, { merge: true });

      return { uid, ...data };

    } catch (error) {
      console.error("ERRO CRÍTICO NO UPDATE_ME:", error);
      throw error;
    }
  }

  /**
   * ATUALIZAÇÃO DE ADVOGADO (Admin)
   */
  async updateAdvogado(userId, data) {
    const { name, email, password, cpfCnpj, oab, phone, dataNascimento, estadoCivil, endereco } = data;

    // 1. Auth
    const authUpdates = {};
    if (name) authUpdates.displayName = name;
    if (email) authUpdates.email = email;
    if (password && password.trim().length >= 6) authUpdates.password = password;
    
    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }

    // 2. Firestore
    const firestoreData = { updatedAt: new Date() };
    if (name) firestoreData.name = name;
    if (email) firestoreData.email = email;
    if (cpfCnpj !== undefined) firestoreData.cpfCnpj = cpfCnpj;
    if (tipoPessoa !== undefined) firestoreData.tipoPessoa = tipoPessoa;
    if (phone !== undefined) firestoreData.phone = phone;
    if (oab !== undefined) firestoreData.oab = oab;
    if (dataNascimento !== undefined) firestoreData.dataNascimento = dataNascimento;
    if (estadoCivil !== undefined) firestoreData.estadoCivil = estadoCivil;
    
    if (endereco) {
      firestoreData.endereco = this._cleanAddress(endereco);
    }

    await db.collection('users').doc(userId).set(firestoreData, { merge: true });

    return { uid: userId, ...data };
  }

  async listAdvogados() {
    const listUsersResult = await auth.listUsers(1000);
    return listUsersResult.users
      .filter(user => user.customClaims && user.customClaims.role === 'advogado')
      .map(u => ({ uid: u.uid, email: u.email, name: u.displayName }));
  }

  async deleteAdvogado(userId) {
    await auth.deleteUser(userId);
    await db.collection('users').doc(userId).delete();
    return { message: 'Deletado com sucesso.' };
  }
  
  async uploadProfilePhoto(userId, file) {
     const cloudinary = require('../../config/cloudinary.config');
     return new Promise((resolve, reject) => {
       const uploadStream = cloudinary.uploader.upload_stream(
         { folder: `users/${userId}/profile`, public_id: 'avatar', overwrite: true, transformation: [{ width: 500, height: 500, crop: "fill" }] },
         async (error, result) => {
           if (error) return reject(error);
           await auth.updateUser(userId, { photoURL: result.secure_url });
           resolve({ photoUrl: result.secure_url });
         }
       );
       uploadStream.end(file.buffer);
     });
  }
}

module.exports = new UserService();