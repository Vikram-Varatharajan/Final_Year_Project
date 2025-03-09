import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  if (!user) {
    // If no user is logged in, redirect to login
    return <Navigate to="/login" replace />;
  }

  // Check if the user's role is in the allowed roles
  if (!allowedRoles.includes(user.role)) {
    // If the user doesn't have the required role, redirect to an appropriate page
    return <Navigate to="/" replace />;
  }

  // If user is authenticated and has the correct role, render the children
  return children;
};

export default ProtectedRoute;