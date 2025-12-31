const messageRepository = require('./message.repository');
const { auth } = require('../../config/firebase.config');
const userRepository = require('../user/user.repository');

class MessageService {
  async startConversation(currentUserId, participantId) {
    try {
      // 1. Busca os dados do participante no Firebase Auth
      // Ajustado de otherUserId para participantId (o parâmetro da função)
      const userRecord = await auth.getUser(participantId);

      // 2. Chama o repositório para buscar ou criar a conversa no Firestore
      const conversation = await messageRepository.findOrCreateConversation(currentUserId, participantId);

      // 3. Retorna um único objeto consolidado
      return {
        ...conversation,
        participant: {
          uid: userRecord.uid,
          name: userRecord.displayName || userRecord.email.split('@')[0],
          photoURL: userRecord.photoURL || null
        }
      };
    } catch (error) {
      console.error("Erro ao validar usuário participante:", error);

      // Fallback: Se o Auth falhar, tenta retornar ao menos a conversa bruta
      const conversation = await messageRepository.findOrCreateConversation(currentUserId, participantId);
      return {
        ...conversation,
        participant: { name: 'Usuário', photoURL: null }
      };
    }
  }

  async getConversations(currentUserId) {
    const conversations = await messageRepository.getUserConversations(currentUserId);

    const enriched = await Promise.all(conversations.map(async (conv) => {
      // 1. Identifica o outro participante
      const otherUserId = conv.participants.find(id => id !== currentUserId);

      if (!otherUserId) {
        return { ...conv, participant: { name: 'Sistema', photoURL: null } };
      }

      try {
        // 2. Busca dados de Acesso (Auth) e dados de Perfil (Firestore) em paralelo
        // Isso é mais performático
        const [userRecord, dbUserDoc] = await Promise.all([
          auth.getUser(otherUserId),
          db.collection('users').doc(otherUserId).get()
        ]);

        const userData = dbUserDoc.exists ? dbUserDoc.data() : {};

        return {
          ...conv,
          participant: {
            uid: userRecord.uid,
            // Prioriza o nome do banco de dados (Firestore), depois displayName do Auth
            name: userData.name || userRecord.displayName || userRecord.email.split('@')[0],
            // Prioriza a foto do Cloudinary (photoUrl), depois a do Auth
            photoURL: userData.photoUrl || userRecord.photoURL || null
          }
        };
      } catch (e) {
        console.error(`Erro ao enriquecer conversa para o usuário ${otherUserId}:`, e.message);

        // Fallback robusto caso o usuário não seja encontrado no Auth
        return {
          ...conv,
          participant: {
            name: 'Usuário Externo',
            photoURL: null
          }
        };
      }
    }));

    return enriched;
  }

  async sendMessage(conversationId, userId, content) {
    const messageData = {
      content,
      senderId: userId,
      createdAt: new Date().toISOString(), // Use string ISO para facilitar no frontend
      read: false
    };

    return await messageRepository.addMessage(conversationId, messageData);
  }

  async listMessages(conversationId) {
    return await messageRepository.getMessages(conversationId);
  }


}

module.exports = new MessageService();