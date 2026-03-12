import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        setAuthError({ type: 'auth_required' });
      } else {
        setSession(session);
        setUser(session?.user || null);
        if (!session) {
          setAuthError({ type: 'auth_required' });
        }
      }
      setIsLoadingAuth(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const navigateToLogin = async () => {
    // Redirect to Supabase auth with Google provider
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/Dashboard',
      },
    });
    if (error) {
      console.error('Error redirecting to login:', error.message);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};