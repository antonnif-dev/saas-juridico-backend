const messageRepository = require('./message.repository');
const { auth } = require('../../config/firebase.config');

class MessageService {
  async startConversation(currentUserId, participantId) {
    // Busca dados do participante para garantir que existe (opcional, mas bom)
    await auth.getUser(participantId);
    
    const conversation = await messageRepository.findOrCreateConversation(currentUserId, participantId);
    
    // Aqui poderíamos enriquecer o objeto com os nomes dos usuários, 
    // mas retornaremos a conversa bruta por enquanto.
    return conversation;
  }

  async getConversations(currentUserId) {
    const conversations = await messageRepository.getUserConversations(currentUserId);
    
    // Enriquece as conversas com os nomes dos participantes
    const enriched = await Promise.all(conversations.map(async (conv) => {
      const otherUserId = conv.participants.find(id => id !== currentUserId);
      try {
        const userRecord = await auth.getUser(otherUserId);
        return {
          ...conv,
          participant: {
            uid: userRecord.uid,
            name: userRecord.displayName || userRecord.email
          }
        };
      } catch (e) {
        return { ...conv, participant: { name: 'Usuário Desconhecido' } };
      }
    }));

    return enriched;
  }
}

module.exports = new MessageService();