import { Routes, Route, Navigate } from "react-router-dom";

import AuthProvider from "./auth/AuthProvider";
import Login from "./pages/Login";
import ForgotEmail from "./pages/ForgotPassword/ForgotEmail";
import VerifyCode from "./pages/ForgotPassword/VerifyCode";
import NewPassword from "./pages/ForgotPassword/NewPassword";
import ResetSuccess from "./pages/ForgotPassword/ResetSuccess";
import User from "./pages/userManagement";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/adminDashboard";
import ProtectedRoute from './components/protectedRoute';

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/login" element={<Login />} />

      {/* Forgot Password (public) */}
      <Route path="/forgot-password" element={<ForgotEmail />} />
      <Route path="/forgot-password/verify" element={<VerifyCode />} />
      <Route path="/forgot-password/new" element={<NewPassword />} />
      <Route path="/forgot-password/success" element={<ResetSuccess />} />

      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<User />} />
                <Route index element={<Navigate to="users" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />

      {/* Default + 404 */}
      <Route path="/" element={<Navigate to="/login" replace />} />
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