import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { LoadingOverlay } from "@mantine/core";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    // Check role permissions if requiredRole is specified
    if (requiredRole && user?.role !== requiredRole) {
      // Redirect based on user role
      switch (user?.role) {
        case "admin":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "superAgencyAdmin":
        case "agencyAdmin":
        case "agencyStaff":
          navigate("/agency/dashboard", { replace: true });
          break;
          /*
        case "student":
          navigate("/dashboard", { replace: true });
          break;
          */
        case "tutor":
          navigate("/tutor/dashboard", { replace: true });
          break;
        default:
          navigate("/", { replace: true });
      }
      return;
    }

    // If we get here, user is authenticated and has correct role
    setIsChecking(false);
  }, [isAuthenticated, loading, user, requiredRole, navigate]);

  if (loading || isChecking) {
    return <LoadingOverlay visible={true} />;
  }

  return children;
};

export default ProtectedRoute;