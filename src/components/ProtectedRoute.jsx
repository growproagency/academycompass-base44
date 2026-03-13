import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/SupabaseAuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, isLoadingAuth, isAuthorized, isAdmin, authError } = useAuth();
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timer = setTimeout(() => {
      if (isLoadingAuth) {
        console.error('⏰ Auth initialization timeout (10 seconds exceeded)');
        setAuthTimeout(true);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timer);
  }, [isLoadingAuth]);

  console.log('🛡️ ProtectedRoute check:', { 
    user: !!user, 
    profile: !!profile, 
    isLoadingAuth, 
    isAuthorized: user ? isAuthorized() : false,
    requireAdmin,
    isAdmin: user ? isAdmin() : false,
    authError: !!authError,
    authTimeout
  });

  // Show critical error page only for unexpected system failures
  if (authTimeout && authError) {
    console.error('💥 Critical auth system failure:', authError);
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold">System Error</h2>
          <p className="text-sm text-muted-foreground">
            An unexpected authentication error occurred. Please try again.
          </p>
          <div className="flex gap-2 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
            >
              Retry
            </button>
            <button
              onClick={() => window.location.replace('/SignIn')}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Auth timeout without error means stale state - redirect to sign in
  if (authTimeout && !authError) {
    console.log('🔄 Redirect reason: Auth timeout, redirecting to Sign In');
    return <Navigate to="/SignIn" replace />;
  }

  if (isLoadingAuth) {
    console.log('⏳ Waiting for auth initialization to complete...');
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🔄 Redirect reason: No authenticated user, redirecting to Sign In');
    return <Navigate to="/SignIn" replace />;
  }

  if (!isAuthorized()) {
    console.log('🔄 Redirect reason: User not authorized (missing org or pending approval), redirecting to Access Pending');
    return <Navigate to="/AccessPending" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    console.log('🔄 Redirect reason: Admin required but user is not admin, redirecting to Dashboard');
    return <Navigate to="/Dashboard" replace />;
  }

  console.log('✅ Access granted - valid session, authorized user');
  return children;
}