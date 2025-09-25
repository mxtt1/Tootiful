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
import AgencyDashboard from "./pages/AgencyDashboard";
import ProtectedRoute from "./components/protectedRoute";
import LandingPage from "./pages/landingPage";
import AboutUs from "./pages/aboutUs"; // ✅ import it
import Register from "./pages/register";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/aboutUs" element={<AboutUs />} /> {/* ✅ add route */}
      <Route path="/register" element={<Register />} />
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
      {/* Agency (unprotected for testing) */}
      <Route
        path="/agency/*"
        element={
          <AdminLayout>
            <Routes>
              <Route path="dashboard" element={<AgencyDashboard />} />
              <Route index element={<Navigate to="dashboard" replace />} />
            </Routes>
          </AdminLayout>
        }
      />
      {/* Default + 404 */}
      <Route path="/" element={<Navigate to="/landing" replace />} />
      <Route path="*" element={<Navigate to="/landing" replace />} />
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
