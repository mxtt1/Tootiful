import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Helper for protected pages
  const AuthGate = ({ children }) => {
    if (loading) return null;
    if (!isAuthenticated) return null;
    return children;
  };

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
        navigate("/login");
        return;
      }

      // Verify token with backend and get user info
      const response = await apiClient.get("/auth/me");
      if (response && response.user) {
        setUser(response.user);
        setIsAuthenticated(true);
      } else {
        navigate("/login");
      }
    } catch (error) {
      console.error("Auth check failed:", error);
      // Clear invalid tokens
      localStorage.removeItem("accessToken");
      navigate("/login");
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      let response = null;

      // Try agency login first
      try {
        response = await apiClient.post("/auth/agency-login", { email, password });
        console.log('Agency login successful');
      } catch (err) {
        console.error('Agency login failed:', err);
      }

      // If agency login failed, try admin login
      if (!response) {
        try {
          response = await apiClient.post("/auth/login?admin=true", { email, password });
          console.log('Regular admin login successful');
        } catch (err) {
          console.log('Admin login failed:', err);
          throw err;
        }
      }

      const { accessToken, user: userData } = response;

      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("user", JSON.stringify(userData));

      setUser(userData);
      setIsAuthenticated(true);

      return { success: true, user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      let message = error.response?.data?.message || error.message || "Unknown error";
      if (message === "Failed to fetch" || !message) {
        message = "Network error. Please try again.";
      }
      return { success: false, error: message };
    }
  };
  // Note: Admin accounts are pre-created, no public signup functionality needed

  const logout = async () => {
    try {
      // call backend logout to destroy refresh token
      await apiClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      // Clear local storage and state regardless of backend response
      localStorage.removeItem("accessToken");
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
    AuthGate
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
