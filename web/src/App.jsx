import { Routes, Route, Navigate } from "react-router-dom";

import AuthProvider from "./auth/AuthProvider";
import Login from "./pages/Login";
import ForgotEmail from "./pages/ForgotPassword/ForgotEmail";
import VerifyCode from "./pages/ForgotPassword/VerifyCode";
import NewPassword from "./pages/ForgotPassword/NewPassword";
import ResetSuccess from "./pages/ForgotPassword/ResetSuccess";
import AdminLayout from "./layouts/AdminLayout";
import ProtectedRoute from "./components/protectedRoute";
import LandingPage from "./pages/landingPage";
import AboutUs from "./pages/aboutUs";
import Register from "./pages/register";
// admin
import AdminDashboard from "./pages/admin/adminDashboard";
import User from "./pages/admin/userManagement";
//agency
import AgencyDashboard from "./pages/agency/AgencyDashboard";
import TutorManagement from "./pages/agency/TutorManagement";
import AgencyProfile from "./pages/agency/agencyProfile";
import AgencyManagement from "./pages/agency/agencyManagement";
import VerifyEmailPending from "./pages/VerifyEmailPending";
import PlatformAdminAgencyManagement from "./pages/admin/agencyManagement";

function AppRoutes() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/landing" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/aboutUs" element={<AboutUs />} /> {/* ✅ add route */}
      <Route path="/register" element={<Register />} />
      {/* email verification for Agency */}
      <Route path="/verify-email-pending" element={<VerifyEmailPending />} />
      {/* Forgot Password (public) */}
      <Route path="/forgot-password" element={<ForgotEmail />} />
      <Route path="/forgot-password/verify" element={<VerifyCode />} />
      <Route path="/forgot-password/new" element={<NewPassword />} />
      <Route path="/forgot-password/success" element={<ResetSuccess />} />
      {/* Agency aliases reusing the same screens with context */}
      <Route
        path="/agency/forgot/email"
        element={<ForgotEmail context="agency" />}
      />
      <Route
        path="/agency/forgot/verify"
        element={<VerifyCode context="agency" />}
      />
      <Route
        path="/agency/forgot/new-password"
        element={<NewPassword context="agency" />}
      />
      <Route
        path="/agency/forgot/success"
        element={<ResetSuccess context="agency" />}
      />
      {/* Admin */}
      <Route
        path="/admin/*"
        element={
          <ProtectedRoute requiredRole="admin">
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AdminDashboard />} />
                <Route path="users" element={<User />} />
                <Route
                  path="agencies"
                  element={<PlatformAdminAgencyManagement />}
                />
                <Route index element={<Navigate to="users" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agency/*"
        element={
          <ProtectedRoute
            requiredRole={[
              "agencyAdmin",
              "superAgencyAdmin",
              "agencyStaff",
              "agency",
            ]}
          >
            <AdminLayout>
              <Routes>
                <Route path="dashboard" element={<AgencyDashboard />} />
                <Route path="tutors" element={<TutorManagement />} />
                <Route path="management" element={<AgencyManagement />} />
                <Route path="profile" element={<AgencyProfile />} />
                <Route index element={<Navigate to="dashboard" replace />} />
              </Routes>
            </AdminLayout>
          </ProtectedRoute>
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
