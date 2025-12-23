const notificationService = require('../../modules/notification/notification.service');

class NotificationController {
  async getReadStatus(req, res) {
    try {
      const userId = req.user.uid;
      const readIds = await notificationService.getReadStatus(userId);
      res.status(200).json(readIds);
    } catch (error) {
      console.error('Erro ao buscar status de leitura:', error);
      res.status(500).json({ message: 'Erro ao processar notificações.' });
    }
  }

  async markRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.uid;
      await notificationService.markRead(userId, id);
      res.status(204).send();
    } catch (error) {
      console.error('Erro ao marcar como lido:', error);
      res.status(500).json({ message: 'Erro ao salvar marcação de leitura.' });
    }
  }
}

module.exports = new NotificationController();