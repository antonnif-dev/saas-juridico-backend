const { db } = require('../../config/firebase.config');
const conversationsCollection = db.collection('conversations');

class MessageRepository {
  // Cria ou busca uma conversa existente
  async findOrCreateConversation(userId, participantId) {
    // Tenta encontrar uma conversa onde os dois usuários sejam participantes
    // Nota: Em produção, idealmente usamos um ID composto ou array-contains, 
    // mas aqui faremos uma criação simples para funcionar.
    const snapshot = await conversationsCollection
      .where('participants', 'array-contains', userId)
      .get();

    let existingConv = null;
    
    snapshot.forEach(doc => {
      const data = doc.data();
      if (data.participants.includes(participantId)) {
        existingConv = { id: doc.id, ...data };
      }
    });

    if (existingConv) return existingConv;

    // Se não existe, cria uma nova
    const newConvData = {
      participants: [userId, participantId],
      createdAt: new Date(),
      updatedAt: new Date(),
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
}

module.exports = new MessageRepository();