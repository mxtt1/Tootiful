import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';
import { LoadingOverlay } from '@mantine/core';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const navigate = useNavigate();
  const { isAuthenticated, user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }

    if (!loading && isAuthenticated && requiredRole && user?.role !== requiredRole) {
      // Redirect based on user role or to home
      if (user?.role === 'student') {
        navigate('/dashboard', { replace: true });
      } else if (user?.role === 'tutor') {
        navigate('/tutor/dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    }
  }, [isAuthenticated, loading, user, requiredRole, navigate]);

  if (loading) {
    return <LoadingOverlay visible={true} />;
  }

  if (!isAuthenticated || (requiredRole && user?.role !== requiredRole)) {
    return null;
  }

  return children;
};

export default ProtectedRoute;