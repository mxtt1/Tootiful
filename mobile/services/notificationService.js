import apiClient from './apiClient';

class NotificationService {
  async getUserNotifications(options = {}) {
    const { limit = 50, offset = 0, unreadOnly = false } = options;
    
    const params = new URLSearchParams();
    if (limit) params.append('limit', limit);
    if (offset) params.append('offset', offset);
    if (unreadOnly) params.append('unreadOnly', unreadOnly);
    
    const response = await apiClient.get(`/notifications?${params}`);
    return response.data;
  }

  async getNotificationStats() {
    const response = await apiClient.get('/notifications/stats');
    return response.data;
  }

  async markAsRead(notificationId) {
    const response = await apiClient.patch(`/notifications/${notificationId}/read`);
    return response.data;
  }

  async markAllAsRead() {
    const response = await apiClient.patch('/notifications/read-all');
    return response.data;
  }

  async deleteNotification(notificationId) {
    const response = await apiClient.delete(`/notifications/${notificationId}`);
    return response.data;
  }
    async sendGradeProgressionNotifications(lessonId, selectedLessonIds = [], customMessage = null) {
    const payload = {
      selectedLessonIds,
      customMessage // ✅ Include custom message in payload
    };
    
    const response = await apiClient.post(`/notifications/grade-progression/${lessonId}`, payload);
    return response.data;
  }
  
}

export default new NotificationService();