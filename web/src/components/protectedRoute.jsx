import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { LoadingOverlay } from "@mantine/core";
import { useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, loading } = useAuth();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (loading) return;

    // Always check authentication on route change (including back navigation)
    if (!isAuthenticated) {
      navigate("/login", { replace: true });
      return;
    }

    // Check role permissions if requiredRole is specified
    let roleIsAllowed = false;
    if (!requiredRole) {
      roleIsAllowed = true;
    } else if (Array.isArray(requiredRole)) {
      // Check both user.role and user.userType for agency routes
      roleIsAllowed =
        requiredRole.includes(user?.role) ||
        requiredRole.includes(user?.userType);
    } else {
      roleIsAllowed =
        user?.role === requiredRole || user?.userType === requiredRole;
    }

    if (!roleIsAllowed) {
      // Redirect based on user role/userType
      switch (user?.role || user?.userType) {
        case "admin":
          navigate("/admin/dashboard", { replace: true });
          break;
        case "superAgencyAdmin":
        case "agencyAdmin":
        case "agencyStaff":
        case "agency":
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
    // now effect will re-run on location change
  }, [
    isAuthenticated,
    loading,
    user,
    requiredRole,
    navigate,
    location.pathname,
  ]);

  if (loading || isChecking) {
    return <LoadingOverlay visible={true} />;
  }

  return children;
};

export default ProtectedRoute;
