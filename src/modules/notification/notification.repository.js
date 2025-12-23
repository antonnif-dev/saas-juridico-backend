const { db } = require('../../config/firebase.config');

class NotificationRepository {
  constructor() {
    this.collection = db.collection('user_notifications_status');
  }

  async markAsRead(userId, resourceId) {
    const docId = `${userId}_${resourceId}`;
    await this.collection.doc(docId).set({
      userId,
      resourceId,
      readAt: new Date()
    });
    return { success: true };
  }

  async getReadIds(userId) {
    const snapshot = await this.collection
      .where('userId', '==', userId)
      .get();
    
    return snapshot.docs.map(doc => doc.data().resourceId);
  }
}

module.exports = new NotificationRepository();