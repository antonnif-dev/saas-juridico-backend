const { auth, db } = require('../../config/firebase.config');
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
    // Agora desestruturamos todos os novos campos
    const {
      name, email, password,
      oab, dataNascimento, estadoCivil, telefone,
      endereco // Esperamos que venha um objeto { rua, numero, bairro... }
    } = userData;

    // 1. Cria o Login
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    // 2. Define a Permissão
    await auth.setCustomUserClaims(userRecord.uid, { role: 'advogado' });

    // 3. Salva a Ficha Completa no Firestore
    await db.collection('users').doc(userRecord.uid).set({
      name: name,
      email: email,
      role: 'advogado',
      status: 'ativo',
      createdAt: new Date(),

      // Novos Campos
      oab: oab || '',
      dataNascimento: dataNascimento || '',
      estadoCivil: estadoCivil || '',
      phone: telefone || '', // Padronizando como 'phone' para bater com o front

      // Endereço (salva o objeto completo ou vazio)
      endereco: endereco || {
        cep: '', rua: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
      },

      // A imagem será vazia no início. O advogado faz o upload depois no "Meu Perfil"
      photoUrl: '',
      tipoPessoa: 'Física'
    });

    return {
      uid: userRecord.uid,
      email: userRecord.email,
      role: 'advogado'
    };
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
    const {
      name, email, password,
      cpfCnpj, tipoPessoa, phone, oab, dataNascimento, estadoCivil, endereco
    } = data;

    // 1. Auth (Login)
    const currentUserRecord = await auth.getUser(uid);
    const updateData = {};

    if (name) updateData.displayName = name;
    if (email && email !== currentUserRecord.email) updateData.email = email;
    if (password && password.trim().length >= 6) updateData.password = password;

    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(uid, updateData);
    }

    // 2. Firestore (Dados)
    const isClient = currentUserRecord.customClaims?.role === 'cliente';

    // Define explicitamente onde salvar
    const targetRef = isClient
      ? db.collection('clients').doc(uid)
      : db.collection('users').doc(uid);

    const firestoreData = { updatedAt: new Date() };

    // Mapeia todos os campos novos para o objeto de salvamento
    if (cpfCnpj !== undefined) firestoreData.cpfCnpj = cpfCnpj;
    if (tipoPessoa !== undefined) firestoreData.tipoPessoa = tipoPessoa;
    if (phone !== undefined) firestoreData.phone = phone;
    if (oab !== undefined) firestoreData.oab = oab;
    if (dataNascimento !== undefined) firestoreData.dataNascimento = dataNascimento;
    if (estadoCivil !== undefined) firestoreData.estadoCivil = estadoCivil;
    if (endereco !== undefined) firestoreData.endereco = endereco;

    // Atualiza campos básicos também para manter sincronia
    if (name) firestoreData.name = name;
    if (email) firestoreData.email = email;

    // Salva com merge (cria se não existir, atualiza se existir)
    await targetRef.set(firestoreData, { merge: true });

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
    const {
      name, email, password,
      cpfCnpj, oab, phone, dataNascimento, estadoCivil, endereco
    } = dataToUpdate;

    const authUpdates = {};
    if (name) authUpdates.displayName = name;
    if (email) authUpdates.email = email;
    if (password && password.trim().length >= 6) authUpdates.password = password;

    if (Object.keys(authUpdates).length > 0) {
      await auth.updateUser(userId, authUpdates);
    }

    const firestoreData = {
      updatedAt: new Date()
    };

    if (name) firestoreData.name = name;
    if (email) firestoreData.email = email;
    if (cpfCnpj !== undefined) firestoreData.cpfCnpj = cpfCnpj;
    if (oab !== undefined) firestoreData.oab = oab;
    if (phone !== undefined) firestoreData.phone = phone;
    if (dataNascimento !== undefined) firestoreData.dataNascimento = dataNascimento;
    if (estadoCivil !== undefined) firestoreData.estadoCivil = estadoCivil;
    if (endereco !== undefined) firestoreData.endereco = endereco;

    await db.collection('users').doc(userId).set(firestoreData, { merge: true });

    return {
      uid: userId,
      ...dataToUpdate
    };
  }

  async deleteAdvogado(userId) {
    await auth.deleteUser(userId);
    await db.collection('users').doc(userId).delete();
    return { message: 'Usuário e dados deletados com sucesso.' };
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