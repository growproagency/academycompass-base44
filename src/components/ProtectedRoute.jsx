import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/SupabaseAuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, profile, isLoadingAuth, isAuthorized, isAdmin, authError, session } = useAuth();
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    // Set a timeout to prevent infinite loading
    const timer = setTimeout(() => {
      if (isLoadingAuth) {
        console.error('⏰ ProtectedRoute: Auth initialization timeout (15 seconds exceeded)');
        setAuthTimeout(true);
      }
    }, 15000); // 15 second timeout (increased from 10)

    return () => clearTimeout(timer);
  }, [isLoadingAuth]);

  console.log('🛡️ ProtectedRoute evaluation:', { 
    isLoadingAuth,
    hasUser: !!user, 
    hasProfile: !!profile,
    hasSession: !!session,
    organizationId: profile?.organization_id,
    profileStatus: profile?.status,
    isAuthorized: user ? isAuthorized() : 'N/A (no user)',
    requireAdmin,
    isAdmin: user ? isAdmin() : 'N/A (no user)',
    authError: authError?.message || null,
    authTimeout,
    decision: isLoadingAuth ? 'WAITING' : 
              authTimeout ? 'TIMEOUT' : 
              !user ? 'NO_USER' : 
              !isAuthorized() ? 'NOT_AUTHORIZED' : 
              (requireAdmin && !isAdmin()) ? 'NOT_ADMIN' : 'ALLOW'
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

  // CRITICAL: Wait for auth initialization to complete before making decisions
  if (isLoadingAuth) {
    console.log('⏳ ProtectedRoute: Auth still loading, showing loading state (do NOT redirect yet)');
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Auth initialization complete - now safe to make routing decisions
  if (!user) {
    console.log('🔄 ProtectedRoute redirect: No authenticated user found after auth init → /SignIn');
    return <Navigate to="/SignIn" replace />;
  }

  if (!isAuthorized()) {
    console.log('🔄 ProtectedRoute redirect: User authenticated but not authorized (org/status issue) → /AccessPending');
    return <Navigate to="/AccessPending" replace />;
  }

  if (requireAdmin && !isAdmin()) {
    console.log('🔄 ProtectedRoute redirect: Admin route but user is not admin → /Dashboard');
    return <Navigate to="/Dashboard" replace />;
  }

  console.log('✅ ProtectedRoute: Access granted - rendering protected content');
  return children;
}