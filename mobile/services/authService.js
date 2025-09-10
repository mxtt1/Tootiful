import apiClient from "./apiClient.js";

class AuthService {
  // Student login
  async login(email, password) {
    try {
      const response = await apiClient.login(email, password);

      return response; // Only return if success
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // Important so LoginScreen's catch can Alert
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