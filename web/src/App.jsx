import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AuthProvider, { useAuth } from "./auth/AuthProvider";
import Login from "./pages/Login";
import User from "./pages/userManagement";
import AdminLayout from "./layouts/AdminLayout";

// Demo Route Component (bypass authentication for demo purposes)
const DemoRoute = ({ children }) => {
  return children;
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#667eea",
        }}
      >
        Loading...
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "18px",
          color: "#667eea",
        }}
      >
        Loading...
      </div>
    );
  }

  return !isAuthenticated ? children : <Navigate to="/dashboard" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Main Page - Login */}
      <Route path="/" element={<Login />} />

      {/* Login Route */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />

      {/* Demo Routes - Direct access for demo purposes (bypass authentication) */}
      <Route
        path="/dashboard"
        element={
          <DemoRoute>
            <AdminLayout>
              <div style={{ padding: "20px", fontSize: "18px" }}>
                <h2>Dashboard - Coming Soon</h2>
                <p>This is Tarsha's area for the admin dashboard.</p>
                <p
                  style={{
                    color: "#667eea",
                    fontSize: "14px",
                    marginTop: "20px",
                  }}
                >
                  💡 Demo Mode: Direct access enabled for demonstration
                </p>
              </div>
            </AdminLayout>
          </DemoRoute>
        }
      />
      <Route
        path="/users"
        element={
          <DemoRoute>
            <AdminLayout>
              <User />
            </AdminLayout>
          </DemoRoute>
        }
      />

      {/* 404 - Redirect to login */}
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
