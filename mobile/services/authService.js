import apiClient from "./apiClient.js";

class AuthService {
  // Student login
  async loginStudent(email, password) {
    try {
      return await apiClient.loginStudent(email, password);
    } catch (error) {
      console.error("Student login failed:", error);
      throw error;
    }
  }

  // Tutor login
  async loginTutor(email, password) {
    try {
      return await apiClient.loginTutor(email, password);
    } catch (error) {
      console.error("Tutor login failed:", error);
      throw error;
    }
  }

  // Refresh access token
  async refreshToken() {
    try {
      return await apiClient.refreshToken();
    } catch (error) {
      console.error("Token refresh failed:", error);
      throw error;
    }
  }

  // Logout (current device)
  async logout() {
    try {
      return await apiClient.logout();
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  // Logout all devices
  async logoutAll() {
    try {
      return await apiClient.logoutAll();
    } catch (error) {
      console.error("Logout all devices failed:", error);
      throw error;
    }
  }

  // Get current access token
  getCurrentToken() {
    return apiClient.accessToken;
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!apiClient.accessToken;
  }

  // Auto-refresh token with retry logic
  async autoRefreshToken() {
    if (!this.isAuthenticated()) {
      return false;
    }

    try {
      await this.refreshToken();
      return true;
    } catch (error) {
      // If refresh fails, user needs to login again
      return false;
    }
  }
}

export default new AuthService();
