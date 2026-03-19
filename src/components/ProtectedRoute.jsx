import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './lib/SupabaseAuthContext';

export default function ProtectedRoute({ children, requireAdmin = false }) {
  const { user, isLoadingAuth, isAuthorized, isAdmin, authError } = useAuth();
  const [authTimeout, setAuthTimeout] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (isLoadingAuth) setAuthTimeout(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [isLoadingAuth]);

  if (authTimeout && authError) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background p-4">
        <div className="max-w-md text-center space-y-4">
          <div className="text-destructive text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold">System Error</h2>
          <p className="text-sm text-muted-foreground">An unexpected authentication error occurred. Please try again.</p>
          <div className="flex gap-2 justify-center">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90">Retry</button>
            <button onClick={() => window.location.replace('/SignIn')} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90">Go to Sign In</button>
          </div>
        </div>
      </div>
    );
  }

  if (authTimeout && !authError) return <Navigate to="/SignIn" replace />;

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/SignIn" replace />;
  if (!isAuthorized()) return <Navigate to="/AccessPending" replace />;
  if (requireAdmin && !isAdmin()) return <Navigate to="/Dashboard" replace />;

  return children;
}