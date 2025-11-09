// services/notificationService.js
import apiClient from './apiClient';

class NotificationService {
  async getUserNotifications(limit = 50, offset = 0, unreadOnly = false) {
    try {
      const params = { limit, offset };
      if (unreadOnly) params.unreadOnly = 'true';
      
      const response = await apiClient.get('/notifications', { params });
      console.log('📨 Notifications response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      throw error;
    }
  }

  async getNotificationStats() {
    try {
      const response = await apiClient.get('/notifications/stats');
      console.log('📊 Notification stats:', response);
      
      return {
        data: response.data || { total: 0, unread: 0 },
        success: response.success
      };
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error);
      throw error;
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      console.log('✅ Marked as read:', notificationId);
      return response;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/read-all');
      console.log('✅ Marked all as read');
      return response;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      throw error;
    }
  }
}

export default new NotificationService();