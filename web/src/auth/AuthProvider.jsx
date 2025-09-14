import React, { createContext, useContext, useState, useEffect } from "react";
import apiClient from "../api/apiClient";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 🚧 DEVELOPMENT MODE - Set to true to bypass authentication
  const DEV_MODE_BYPASS = true; // Change to false for production

  // Pre-made admin accounts for team members
  const ADMIN_ACCOUNTS = {
    "kyaw@example.com": {
      password: "kyaw123",
      name: "Kyaw",
      role: "Admin",
    },
    "matthew@example.com": {
      password: "matthew123",
      name: "Matthew",
      role: "Admin",
    },
    "alastair@example.com": {
      password: "alastair123",
      name: "Alastair",
      role: "Admin",
    },
    "tarsha@example.com": {
      password: "tarsha123",
      name: "Tarsha",
      role: "Admin",
    },
    "brian@example.com": {
      password: "brian123",
      name: "Brian",
      role: "Admin",
    },
  };

  // Check if user is authenticated on app load
  useEffect(() => {
    if (DEV_MODE_BYPASS) {
      // Check if user was previously logged in
      const savedUser = localStorage.getItem("dev_user");
      if (savedUser) {
        const user = JSON.parse(savedUser);
        setUser(user);
        setIsAuthenticated(true);
      }
      setLoading(false);
    } else {
      checkAuthStatus();
    }
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setLoading(false);
        return;
      }

      // Verify token with backend and get user info
      const response = await apiClient.get("/auth/me");
      if (response.data && response.data.user) {
        setUser(response.data.user);
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // Clear invalid tokens
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    // 🚧 DEVELOPMENT MODE - Check against pre-made admin accounts
    if (DEV_MODE_BYPASS) {
      const account = ADMIN_ACCOUNTS[email];
      if (account && account.password === password) {
        const mockUser = {
          id: Date.now(),
          name: account.name,
          email: email,
          role: account.role,
        };

        // Store user for persistence
        localStorage.setItem("dev_user", JSON.stringify(mockUser));

        setUser(mockUser);
        setIsAuthenticated(true);
        return { success: true, user: mockUser };
      } else {
        // Check if it's a valid team email but wrong password
        if (Object.keys(ADMIN_ACCOUNTS).includes(email)) {
          return {
            success: false,
            error: "Invalid password. Please try again.",
          };
        } else {
          return {
            success: false,
            error: "Invalid email. Please try again.",
          };
        }
      }
    }

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      const { accessToken, refreshToken, user: userData } = response.data;

      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      if (rememberMe) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      const message =
        error.response?.data?.message ||
        "Login failed. Please check your credentials.";
      return { success: false, error: message };
    }
  };

  // Note: Admin accounts are pre-created, no public signup functionality needed

  const logout = async () => {
    try {
      // Call backend logout if refresh token exists
      const refreshToken = localStorage.getItem("refreshToken");
      if (refreshToken) {
        await apiClient.post("/auth/logout", { refreshToken });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and state regardless of backend response
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("dev_user"); // Clear dev user
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      await apiClient.post("/auth/forgot-password", { email });
      return {
        success: true,
        message: "Password reset email sent successfully.",
      };
    } catch (error) {
      console.error("Forgot password failed:", error);
      const message =
        error.response?.data?.message ||
        "Failed to send reset email. Please try again.";
      return { success: false, error: message };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await apiClient.post("/auth/reset-password", {
        token,
        newPassword,
      });
      return { success: true, message: "Password reset successfully." };
    } catch (error) {
      console.error("Reset password failed:", error);
      const message =
        error.response?.data?.message ||
        "Failed to reset password. Please try again.";
      return { success: false, error: message };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    forgotPassword,
    resetPassword,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
