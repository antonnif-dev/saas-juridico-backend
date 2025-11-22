const { auth, db } = require('../../config/firebase.config');

class UserService {

  /**
   * CRIAÇÃO DE ADVOGADO (Admin)
   */
  async createAdvogado(userData) {
    const { name, email, password, oab, dataNascimento, estadoCivil, telefone, endereco } = userData;

    // 1. Auth
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. Claims
    await auth.setCustomUserClaims(userRecord.uid, { role: 'advogado' });

    // 3. Firestore (Uso direto de db.collection para evitar erros)
    await db.collection('users').doc(userRecord.uid).set({
      name,
      email,
      role: 'advogado',
      status: 'ativo',
      createdAt: new Date(),
      // Campos extras com valores padrão seguros
      cpfCnpj: '',
      phone: telefone || '',
      oab: oab || '',
      dataNascimento: dataNascimento || '',
      estadoCivil: estadoCivil || '',
      tipoPessoa: 'Física',
      endereco: endereco || { cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' }
    });

    return { uid: userRecord.uid, email, name, role: 'advogado' };
  }

  /**
   * BUSCA DO PRÓPRIO PERFIL
   */
  async getMe(uid) {
    const userRecord = await auth.getUser(uid);

    // Tenta buscar na coleção de equipe
    let doc = await db.collection('users').doc(uid).get();

    // Se não achar, tenta na coleção de clientes
    if (!doc.exists) {
      doc = await db.collection('clients').doc(uid).get();
    }

    const data = doc.exists ? doc.data() : {};

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      name: userRecord.displayName,
      photoUrl: userRecord.photoURL,
      role: userRecord.customClaims?.role,
      // Retorna dados do banco ou strings vazias
      cpfCnpj: data.cpfCnpj || '',
      tipoPessoa: data.tipoPessoa || 'Física',
      phone: data.phone || '',
      oab: data.oab || '',
      dataNascimento: data.dataNascimento || '',
      estadoCivil: data.estadoCivil || '',
      endereco: data.endereco || { cep: "", rua: "", numero: "", complemento: "", bairro: "", cidade: "", estado: "" }
    };
  }

  async updateMe(uid, data) {
    try {
      // 1. Busca usuário no Auth para checar permissão/role
      const userRecord = await auth.getUser(uid);

      // 2. Atualização do Auth (Email/Senha/Nome)
      const authUpdates = {};
      if (data.name) authUpdates.displayName = data.name;
      if (data.email && data.email !== userRecord.email) authUpdates.email = data.email;
      if (data.password) authUpdates.password = data.password;

      if (Object.keys(authUpdates).length > 0) {
        await auth.updateUser(uid, authUpdates);
      }

      // 3. Atualização do Firestore (Dados de Perfil)
      const isClient = userRecord.customClaims?.role === 'cliente';

      // Seleciona a coleção correta
      const collectionName = isClient ? 'clients' : 'users';

      // Monta o objeto APENAS com o que veio definido
      // O uso de '|| null' evita o erro de 'undefined' do Firestore
      const firestoreData = {
        updatedAt: new Date(),
        name: data.name || null,
        email: data.email || null,
        cpfCnpj: data.cpfCnpj || null,
        tipoPessoa: data.tipoPessoa || 'Física',
        phone: data.phone || null,
        oab: data.oab || null,
        dataNascimento: data.dataNascimento || null,
        estadoCivil: data.estadoCivil || null,
        endereco: data.endereco || null
      };

      // Remove chaves nulas para não gravar lixo (opcional, mas limpo)
      Object.keys(firestoreData).forEach(key => firestoreData[key] === null && delete firestoreData[key]);

      // Salva usando db.collection direto
      await db.collection(collectionName).doc(uid).set(firestoreData, { merge: true });

      return { uid, ...data };

    } catch (error) {
      console.error("ERRO NO UPDATE_ME:", error); // Isso vai aparecer no log da Vercel se der erro
      throw error; // Repassa o erro para o controller
    }
  }

  async updateAdvogado(userId, dataToUpdate) {
    const { name, email, password, cpfCnpj, oab, phone, dataNascimento, estadoCivil, endereco } = dataToUpdate;

    // 1. Atualiza Auth
    const authUpdates = {};
    if (name) authUpdates.displayName = name;
    if (email) authUpdates.email = email;
    if (password && password.trim().length >= 6) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }

    // 2. Atualiza Firestore (Sempre na coleção users para advogados)
    const firestoreData = { updatedAt: new Date() };

    if (name) firestoreData.name = name;
    if (email) firestoreData.email = email;
    if (cpfCnpj !== undefined) firestoreData.cpfCnpj = cpfCnpj;
    if (tipoPessoa !== undefined) firestoreData.tipoPessoa = tipoPessoa;
    if (phone !== undefined) firestoreData.phone = phone;
    if (oab !== undefined) firestoreData.oab = oab;
    if (dataNascimento !== undefined) firestoreData.dataNascimento = dataNascimento;
    if (estadoCivil !== undefined) firestoreData.estadoCivil = estadoCivil;
    if (endereco !== undefined) firestoreData.endereco = endereco;

    // Usa db.collection('users') explicitamente
    await db.collection('users').doc(userId).set(firestoreData, { merge: true });

    return { uid: userId, ...dataToUpdate };
  }

  // Outros métodos (listagem, delete, upload)
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