import apiClient from './apiClient';

class NotificationService {
  async getUserNotifications(limit = 50, offset = 0, unreadOnly = false) {
    try {
      const params = { limit, offset };
      if (unreadOnly) params.unreadOnly = 'true';
      
      const response = await apiClient.get('/notifications', { params });
      console.log('📨 Notifications response:', response);
      
      // ✅ Handle different backend response structures
      let notifications = [];
      
      if (Array.isArray(response.data)) {
        // Case 1: Direct array response
        notifications = response.data;
      } else if (response.data?.notifications) {
        // Case 2: Nested in notifications property
        notifications = response.data.notifications;
      } else if (response.data?.data) {
        // Case 3: Nested in data property
        notifications = response.data.data;
      } else if (Array.isArray(response)) {
        // Case 4: Response is directly the array
        notifications = response;
      }
      
      console.log('📨 Extracted notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      console.log('❌ Error details:', error.response?.data);
      return [];
    }
  }

  async getNotificationStats() {
    try {
      const response = await apiClient.get('/notifications/stats');
      console.log('📊 Full stats response:', response);
      
      // ✅ Handle different backend response structures
      let stats = { total: 0, unread: 0 };
      
      if (response.data) {
        if (response.data.total !== undefined) {
          // Case 1: Direct stats object
          stats = response.data;
        } else if (response.data.stats) {
          // Case 2: Nested in stats property
          stats = response.data.stats;
        } else if (response.data.data) {
          // Case 3: Nested in data property
          stats = response.data.data;
        }
      }
      
      console.log('📊 Extracted stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error);
      console.log('❌ Error details:', error.response?.data);
      return { total: 0, unread: 0 };
    }
  }

  async markAsRead(notificationId) {
    try {
      const response = await apiClient.patch(`/notifications/${notificationId}/read`);
      console.log('✅ Marked as read response:', response);
      return response.data || response;
    } catch (error) {
      console.error('❌ Error marking notification as read:', error);
      console.log('❌ Error details:', error.response?.data);
      throw error;
    }
  }

  async markAllAsRead() {
    try {
      const response = await apiClient.patch('/notifications/read-all');
      console.log('✅ Marked all as read response:', response);
      return response.data || response;
    } catch (error) {
      console.error('❌ Error marking all as read:', error);
      console.log('❌ Error details:', error.response?.data);
      throw error;
    }
  }
}

export default new NotificationService();