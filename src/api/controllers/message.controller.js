const messageService = require('../../modules/message/message.service');

class MessageController {
  async createConversation(req, res) {
    try {
      const { participantId } = req.body;
      const conversation = await messageService.startConversation(req.user.uid, participantId);
      res.status(201).json(conversation);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao criar conversa.' });
    }
  }

  async listConversations(req, res) {
    try {
      const list = await messageService.getConversations(req.user.uid);
      res.status(200).json(list);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar conversas.' });
    }
  }

  async sendMessage(req, res) {
    try {
      const { conversationId } = req.params; // Vem da URL
      const { content } = req.body;
      const userId = req.user.uid;

      const message = await messageService.sendMessage(conversationId, userId, content);
      res.status(201).json(message);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Erro ao enviar mensagem.' });
    }
  }

  async listMessages(req, res) {
    try {
      const { conversationId } = req.params;
      const messages = await messageService.listMessages(conversationId);
      res.status(200).json(messages);
    } catch (error) {
      res.status(500).json({ message: 'Erro ao listar mensagens.' });
    }
  }

  
}

module.exports = new MessageController();