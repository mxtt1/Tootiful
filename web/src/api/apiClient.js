class ApiClient {
  constructor() {
    this.baseURL =
      import.meta.env.VITE_API_BASE_URL ||
      "http://ec2-13-214-145-133.ap-southeast-1.compute.amazonaws.com/api";

    if (import.meta.env.VITE_DEBUG === "true") {
      console.log("API Client initialized with baseURL:", this.baseURL);
    }
  }

  // Core HTTP request
  async request(endpoint, options = {}, isRetry = false) {
    const url = `${this.baseURL}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    // Retrieve token from localStorage for each request
    const token = localStorage.getItem("accessToken");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const config = { ...options, headers, credentials: "include" };

    try {
      if (import.meta.env.VITE_DEBUG === "true") {
        console.log("Making request to:", url);
      }

      const response = await fetch(url, config);

      // Handle 401 with refresh (but NOT for login or refresh endpoints, and not for agency users)
      const userStr = localStorage.getItem("user");
      let isAgencyUser = false;
      if (userStr) {
        try {
          const userObj = JSON.parse(userStr);
          isAgencyUser = userObj?.userType === "agency";
        } catch {}
      }
      if (
        response.status === 401 &&
        !isRetry &&
        endpoint !== "/auth/refresh" &&
        endpoint !== "/auth/login" &&
        !isAgencyUser
      ) {
        try {
          await this.refreshToken();
          return await this.request(endpoint, options, true);
        } catch (refreshError) {
          localStorage.removeItem("accessToken");
          // Let the original error bubble up for handling in AuthProvider/Login.jsx
          throw refreshError;
        }
      }

      // Handle empty responses (common with DELETE requests)
      if (
        response.status === 204 ||
        response.headers.get("content-length") === "0"
      ) {
        return {}; // Return empty object for successful empty responses
      }

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
        error.response = { status: response.status, data: errorData };
        throw error;
      }

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await response.json();
      }

      return { success: true };
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // Generic helpers
  async get(endpoint, headers = {}) {
    return this.request(endpoint, { method: "GET", headers });
  }

  async post(endpoint, data = null, headers = {}) {
    const config = { method: "POST", headers };
    if (data) config.body = JSON.stringify(data);
    return this.request(endpoint, config);
  }

  async patch(endpoint, data = null, headers = {}) {
    const config = { method: "PATCH", headers };
    if (data) config.body = JSON.stringify(data);
    return this.request(endpoint, config);
  }

  async delete(endpoint, headers = {}) {
    return this.request(endpoint, { method: "DELETE", headers });
  }

  /* ---------- Forgot Password flow ---------- */

  // Backend expects /auth/forgot-password for initial OTP
  async requestOtp(email) {
    return this.post("/auth/forgot-password", { email });
  }

  // For "Resend code" button
  async resendOtp(email) {
    return this.post("/auth/resend-otp", { email });
  }

  // Verify the 6-digit code; server returns { resetToken }
  async verifyOtp(email, code) {
    return this.post("/auth/verify-otp", { email, code });
  }

  // Use short-lived resetToken to set new password
  async resetPassword(email, resetToken, newPassword) {
    return this.post("/auth/reset-password", {
      email,
      resetToken,
      newPassword,
    });
  }
}

export default new ApiClient();
