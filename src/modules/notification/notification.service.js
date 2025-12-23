const notificationRepository = require('./notification.repository');

class NotificationService {
  async markRead(userId, resourceId) {
    if (!userId || !resourceId) {
      throw new Error('Parâmetros inválidos para marcação de leitura.');
    }
    return await notificationRepository.markAsRead(userId, resourceId);
  }

  async getReadStatus(userId) {
    if (!userId) throw new Error('Usuário não identificado.');
    return await notificationRepository.getReadIds(userId);
  }
}

module.exports = new NotificationService();