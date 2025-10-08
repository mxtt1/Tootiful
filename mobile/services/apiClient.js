// API Configuration
import AsyncStorage from "@react-native-async-storage/async-storage";

// Read API base URL from environment variable with fallback
const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://10.0.2.2:3000/api";

// Alternative URLs for different environments:
// Android Emulator: http://10.0.2.2:3000/api
// Web Browser: http://localhost:3000/api
// Physical Device: http://192.168.1.XXX:3000/api (replace XXX with your IP)

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = null;
    // Load token from storage on initialization
    this.loadTokenFromStorage();
  }

  // Load access token from AsyncStorage
  async loadTokenFromStorage() {
    try {
      const token = await AsyncStorage.getItem("accessToken");
      if (token) {
        this.accessToken = token;
      }
    } catch (error) {
      console.error("Failed to load token from storage:", error);
    }
  }

  // Set access token for authenticated requests
  async setAccessToken(token) {
    this.accessToken = token;
    try {
      await AsyncStorage.setItem("accessToken", token);
    } catch (error) {
      console.error("Failed to save token to storage:", error);
    }
  }

  // Clear access token (logout)
  async clearAccessToken() {
    this.accessToken = null;
    try {
      await AsyncStorage.removeItem("accessToken");
    } catch (error) {
      console.error("Failed to remove token from storage:", error);
    }
  }

  // Check if token exists in storage (for auth state checks)
  async hasValidToken() {
    if (!this.accessToken) {
      await this.loadTokenFromStorage();
    }
    return !!this.accessToken;
  }

  // // Core HTTP request method with automatic token refresh
  // async request(endpoint, options = {}, isRetry = false) {
  //   const url = `${this.baseURL}${endpoint}`;

  async request(endpoint, options = {}, isRetry = false) {
    const url = `${this.baseURL}${endpoint}`;
    const skipAuth = !!options._skipAuth; // 🔑 CHANGE: allow public calls

    // Build headers
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Add Authorization header if access token is available
    // if (this.accessToken) {
    //   headers.Authorization = `Bearer ${this.accessToken}`;
    // }

    // Add Authorization header only if we have token AND not skipping
    if (!skipAuth && this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    const config = {
      ...options,
      headers,
      // credentials: "include", // Important: Include cookies for refresh tokens
    };

    try {
      console.log("📡", endpoint);

      const response = await fetch(url, config);

      // // Handle 401 Unauthorized - try to refresh token
      // if (response.status === 401 && !isRetry && endpoint !== "/auth/refresh") {

      // Handle 401 Unauthorized - try to refresh token (but not on skipAuth calls)
      if (
        !skipAuth &&
        response.status === 401 &&
        !isRetry &&
        endpoint !== "/auth/refresh"
      ) {
        console.log("Received 401, attempting token refresh...");
        try {
          await this.refreshToken();
          // Retry the original request with new token
          return await this.request(endpoint, options, true);
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          // Clear token and re-throw original 401 error
          await this.clearAccessToken();
          throw new Error("Invalid Credentials. Please log in again."); //login error message
        }
      }

      // Handle other non-ok responses
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP error! status: ${response.status}` };
        }

        const error = new Error(
          errorData.message || `HTTP error! status: ${response.status}`
        );
        error.status = response.status;
        error.data = errorData;
        throw error;
      }

      // Handle responses that might not have JSON body (like 200 with no content)
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return { success: true }; // For endpoints that return 200 with no body
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: "GET",
      headers,
    });
  }

  // POST request
  async post(endpoint, data = null, headers = {}) {
    const config = {
      method: "POST",
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    return this.request(endpoint, config);
  }

  // PATCH request
  async patch(endpoint, data = null, headers = {}) {
    const config = {
      method: "PATCH",
      headers,
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    return this.request(endpoint, config);
  }

  // DELETE request
  async delete(endpoint, headers = {}) {
    return this.request(endpoint, {
      method: "DELETE",
      headers,
    });
  }

  // Authentication methods
  async login(email, password) {
    const response = await this.post("/auth/login", {
      email,
      password,
    });
    if (response.accessToken) {
      await this.setAccessToken(response.accessToken);
    }
    return response;
  }

  async refreshToken() {
    try {
      const response = await this.post("/auth/refresh");
      if (response.accessToken) {
        await this.setAccessToken(response.accessToken);
      }
      return response;
    } catch (error) {
      // If refresh fails, clear the token
      await this.clearAccessToken();
      throw error;
    }
  }

  async logout() {
    try {
      await this.post("/auth/logout");
    } finally {
      // Always clear token even if logout request fails
      await this.clearAccessToken();
      await AsyncStorage.removeItem("accessToken");
    }
  }

  async logoutAll() {
    try {
      await this.post("/auth/logout-all");
    } finally {
      // Always clear token even if logout request fails
      await this.clearAccessToken();
      await AsyncStorage.removeItem("accessToken");
    }
  }
}

export default new ApiClient();
