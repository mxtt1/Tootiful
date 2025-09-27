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

  // Admin account emails:
  // "e1123046@u.nus.edu", "mattlow1504@gmail.com", "e1122690@u.nus.edu","e1155487@u.nus.edu","E1138943@u.nus.edu"

  // Check if user is authenticated on app load
  useEffect(() => {
    checkAuthStatus();
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
      if (response && response.user) {
        setUser(response.user);
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
    try {
      let response;

      // Try agency login first
      try {
        response = await apiClient.post("/auth/agency-login", {
          email,
          password,
        });
      } catch (agencyError) {
          // If agency login fails, try agency admin login
        try {
        response = await apiClient.post("/auth/agency-admin-login", { 
          email,
          password,
        });
      } catch (agencyAdminError) {
        // If agency admin login fails, try admin/user login
        try {
          response = await apiClient.post("/auth/login?admin=true", {
            email,
            password,
          });
        } catch (userError) {
          // If both fail, throw the original agency error
          throw agencyError;
        }
      }
    }

      const { accessToken, refreshToken, user: userData } = response;

      // userData already has the correct userType from backend
      // No need to add it again

      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      if (rememberMe && refreshToken) {
        localStorage.setItem("refreshToken", refreshToken);
      }

      // Store user data
      localStorage.setItem("user", JSON.stringify(userData));

      // Update state
      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      let message =
        error.response?.data?.message || error.message || "Unknown error";
      if (message === "Failed to fetch" || !message) {
        message = "Network error. Please try again.";
      }
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
    isAgency: user?.userType === 'agency',
    isUser: user?.userType === 'user',
    isAdmin: user?.role === 'admin',
    isAgencyAdmin: user?.userType === 'agencyAdmin'
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
