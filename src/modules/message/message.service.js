const messageRepository = require('./message.repository');
const { auth } = require('../../config/firebase.config');

class MessageService {
  async startConversation(currentUserId, participantId) {
    try {
      const userRecord = await auth.getUser(otherUserId);
      return {
        ...conv,
        participant: {
          uid: userRecord.uid,
          name: userRecord.displayName || userRecord.email,
          photoURL: userRecord.photoURL || null // <--- ADICIONE ESTA LINHA
        }
      };

      const conversation = await messageRepository.findOrCreateConversation(currentUserId, participantId);

      return {
        ...conversation,
        participant: {
          uid: userRecord.uid,
          name: userRecord.displayName || userRecord.email,
          photoURL: userRecord.photoURL || null // Adicionando suporte à foto
        }
      };
    } catch (error) {
      console.error("Erro ao validar usuário participante:", error);
      return await messageRepository.findOrCreateConversation(currentUserId, participantId);
    }
  }

  async getConversations(currentUserId) {
    const conversations = await messageRepository.getUserConversations(currentUserId);

    const enriched = await Promise.all(conversations.map(async (conv) => {
      // Encontra o ID da outra pessoa na conversa
      const otherUserId = conv.participants.find(id => id !== currentUserId);

      if (!otherUserId) {
        return { ...conv, participant: { name: 'Sistema', photoURL: null } };
      }

      try {
        const userRecord = await auth.getUser(otherUserId);
        return {
          ...conv,
          participant: {
            uid: userRecord.uid,
            name: userRecord.displayName || userRecord.email.split('@')[0],
            photoURL: userRecord.photoURL || null // CAMPO ESSENCIAL PARA A FOTO
          }
        };
      } catch (e) {
        console.error(`Erro ao buscar usuário ${otherUserId}:`, e.message);
        // Fallback para não quebrar a listagem, mas indicando que é um usuário da base
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