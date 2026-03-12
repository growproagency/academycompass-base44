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
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Get initial session and profile
    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // Fetch user profile
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, organizations(*)')
            .eq('auth_user_id', session.user.id)
            .single();

          if (!profileError && profileData) {
            setProfile(profileData);
          } else {
            // User authenticated but no profile - create pending profile
            const { data: newProfile } = await supabase
              .from('profiles')
              .insert({
                auth_user_id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.email,
                status: 'pending'
              })
              .select('*, organizations(*)')
              .single();
            
            setProfile(newProfile);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        setAuthError(error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('auth_user_id', session.user.id)
          .single();

        setProfile(profileData);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthorized = () => {
    if (!profile) return false;
    return profile.organization_id && 
           (profile.status === 'approved' || profile.status === 'active');
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const navigateToLogin = () => {
    window.location.href = '/SignIn';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoadingAuth,
        isLoadingPublicSettings: false,
        authError,
        isAuthorized,
        isAdmin,
        navigateToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};