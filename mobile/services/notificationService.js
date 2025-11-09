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
        notifications = response.data;
      } else if (response.data?.notifications) {
        notifications = response.data.notifications;
      } else if (response.data?.data) {
        notifications = response.data.data;
      } else if (Array.isArray(response)) {
        notifications = response;
      }
      
      console.log('📨 Extracted notifications:', notifications);
      return notifications;
    } catch (error) {
      console.error('❌ Error fetching notifications:', error);
      
      // ✅ PROPER ERROR HANDLING - Check if it's a network error
      if (!error.response) {
        console.error('🚨 Network error - no response received');
        // Return empty array for network errors
        return [];
      }
      
      console.log('❌ Error details:', error.response?.data);
      console.log('❌ Error status:', error.response?.status);
      
      // For server errors, still return empty array but log properly
      return [];
    }
  }

  async getNotificationStats() {
    try {
      const response = await apiClient.get('/notifications/stats');
      console.log('📊 Full stats response:', response);
      
      let stats = { total: 0, unread: 0 };
      
      if (response.data) {
        if (response.data.total !== undefined) {
          stats = response.data;
        } else if (response.data.stats) {
          stats = response.data.stats;
        } else if (response.data.data) {
          stats = response.data.data;
        }
      }
      
      console.log('📊 Extracted stats:', stats);
      return stats;
    } catch (error) {
      console.error('❌ Error fetching notification stats:', error);
      
      // ✅ PROPER ERROR HANDLING
      if (!error.response) {
        console.error('🚨 Network error - no response received');
        return { total: 0, unread: 0 };
      }
      
      console.log('❌ Error details:', error.response?.data);
      console.log('❌ Error status:', error.response?.status);
      
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
      
      // ✅ PROPER ERROR HANDLING
      if (!error.response) {
        console.error('🚨 Network error - no response received');
        throw new Error('Network error: Could not mark notification as read');
      }
      
      console.log('❌ Error details:', error.response?.data);
      console.log('❌ Error status:', error.response?.status);
      
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
      
      // ✅ PROPER ERROR HANDLING
      if (!error.response) {
        console.error('🚨 Network error - no response received');
        throw new Error('Network error: Could not mark all as read');
      }
      
      console.log('❌ Error details:', error.response?.data);
      console.log('❌ Error status:', error.response?.status);
      
      throw error;
    }
  }
}

export default new NotificationService();