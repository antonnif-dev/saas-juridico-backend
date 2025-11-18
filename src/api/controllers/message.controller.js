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
}

module.exports = new MessageController();