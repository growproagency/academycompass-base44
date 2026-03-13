import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/SupabaseAuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, isLoadingAuth, isAuthorized, isAdmin } = useAuth();

  console.log('🛡️ ProtectedRoute check:', { 
    user: !!user, 
    profile: !!profile, 
    isLoadingAuth, 
    isAuthorized: isAuthorized(),
    requireAdmin,
    isAdmin: isAdmin()
  });

  if (isLoadingAuth) {
    console.log('⏳ Still loading auth...');
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    console.log('🔒 No user, redirecting to SignIn');
    return <Navigate to="/SignIn" replace />;
  }

  if (!isAuthorized()) {
    console.log('⛔ Not authorized, redirecting to AccessPending');
    return <Navigate to="/AccessPending" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    console.log('👮 Not admin, redirecting to Dashboard');
    return <Navigate to="/Dashboard" replace />;
  }

  console.log('✅ Access granted');
  return children;
}