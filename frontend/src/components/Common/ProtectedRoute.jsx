import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    // You can show a loading spinner here
    return <div>Loading application...</div>;
  }

  if (!isAuthenticated) {
    // Redirect them to the /login page, saving the current location
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If roles are specified, check if the user has one of the required roles
  if (roles && roles.length > 0 && !roles.includes(user?.role)) {
    // User is authenticated but does not have the required role.
    // Check if the user is a lecturer and redirect them to ViewChemicals (/chemicals/list)
    if (user?.role === 'LECTURER') {
      return <Navigate to="/chemicals/list" replace />;
    }

    // Student / COMMON users have no access to staff-only routes. Send them
    // to their own home page (/home) instead of the staff dashboard, which
    // itself requires staff roles and would otherwise cause a redirect loop.
    if (user?.role === 'STUDENT' || user?.role === 'COMMON') {
      return <Navigate to="/home" replace />;
    }

    // For all other roles (ADMIN, TECHNICAL_OFFICER), redirect to the dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default ProtectedRoute;