// API Configuration
const API_BASE_URL = "http://localhost:3000/api";

// For testing on physical device, you might need to use your computer's IP
// const API_BASE_URL = 'http://192.168.1.XXX:3000/api'; // Replace XXX with your IP

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.accessToken = null;
  }

  // Set access token for authenticated requests
  setAccessToken(token) {
    this.accessToken = token;
  }

  // Clear access token (logout)
  clearAccessToken() {
    this.accessToken = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      credentials: "include", // Important: Include cookies for refresh tokens
      ...options,
    };

    // Add Authorization header if access token is available
    if (this.accessToken) {
      config.headers.Authorization = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, config);

      // Handle different response types
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
  async loginStudent(email, password) {
    const response = await this.post("/auth/student/login", {
      email,
      password,
    });
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    return response;
  }

  async loginTutor(email, password) {
    const response = await this.post("/auth/tutor/login", { email, password });
    if (response.accessToken) {
      this.setAccessToken(response.accessToken);
    }
    return response;
  }

  async refreshToken() {
    try {
      const response = await this.post("/auth/refresh");
      if (response.accessToken) {
        this.setAccessToken(response.accessToken);
      }
      return response;
    } catch (error) {
      // If refresh fails, clear the token
      this.clearAccessToken();
      throw error;
    }
  }

  async logout() {
    try {
      await this.post("/auth/logout");
    } finally {
      // Always clear token even if logout request fails
      this.clearAccessToken();
    }
  }

  async logoutAll() {
    try {
      await this.post("/auth/logout-all");
    } finally {
      // Always clear token even if logout request fails
      this.clearAccessToken();
    }
  }
}

export default new ApiClient();
