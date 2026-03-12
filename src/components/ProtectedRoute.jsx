import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/SupabaseAuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, isLoadingAuth, isAuthorized, isAdmin } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/SignIn" replace />;
  }

  if (!isAuthorized()) {
    return <Navigate to="/AccessPending" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    return <Navigate to="/Dashboard" replace />;
  }

  return children;
}