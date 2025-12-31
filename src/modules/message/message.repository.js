const { db } = require('../../config/firebase.config');
const conversationsCollection = db.collection('conversations');

class MessageRepository {
  // Cria ou busca uma conversa existente
  async findOrCreateConversation(userId, participantId) {
    // Busca as conversas do usuário atual
    const snapshot = await conversationsCollection
      .where('participants', 'array-contains', userId)
      .get();

    let existingConv = null;

    // Refina a busca na memória para evitar necessidade de índices compostos complexos agora
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(participantId)) {
        existingConv = { id: doc.id, ...data };
      }
    });

    if (existingConv) return existingConv;

    const newConvData = {
      participants: [userId, participantId],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastMessage: ''
    };

    const docRef = await conversationsCollection.add(newConvData);
    return { id: docRef.id, ...newConvData };
  }

  // Lista conversas de um usuário
  async getUserConversations(userId) {
    const snapshot = await conversationsCollection
      .where('participants', 'array-contains', userId)
      .orderBy('updatedAt', 'desc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  async addMessage(conversationId, messageData) {
    const conversationRef = conversationsCollection.doc(conversationId);

    // 1. Adiciona a mensagem na subcoleção 'messages'
    const messageRef = await conversationRef.collection('messages').add(messageData);

    // 2. Atualiza a conversa com a última mensagem e data
    await conversationRef.update({
      lastMessage: messageData.content,
      updatedAt: messageData.createdAt
    });

    return { id: messageRef.id, ...messageData };
  }

  // Lista mensagens de uma conversa
  async getMessages(conversationId) {
    const snapshot = await conversationsCollection
      .doc(conversationId)
      .collection('messages')
      .orderBy('createdAt', 'asc')
      .get();

    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

module.exports = new MessageRepository();