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
        console.log('🔐 Session loaded:', session?.user ? 'User authenticated' : 'No session');
        console.log('👤 Auth user ID:', session?.user?.id);
        console.log('📧 Auth user email:', session?.user?.email);
        
        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // Fetch user profile
          console.log('🔍 Querying profiles table with auth_user_id:', session.user.id);
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*, organizations(*)')
            .eq('auth_user_id', session.user.id)
            .single();

          console.log('📊 Profile query result:', { profileData, profileError });

          if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
            // Profile doesn't exist or query blocked - set profile to null
            // This will redirect to AccessPending via ProtectedRoute
            setProfile(null);
          } else if (profileData) {
            console.log('✅ Profile loaded successfully:', profileData);
            setProfile(profileData);
          } else {
            // Query succeeded but returned no data
            console.warn('⚠️ Profile query returned no data');
            setProfile(null);
          }
        }
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        setAuthError(error);
      } finally {
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔄 Auth state changed:', _event);
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        console.log('🔍 Re-querying profile after auth change, user ID:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('auth_user_id', session.user.id)
          .single();

        console.log('📊 Profile re-query result:', { profileData, profileError });

        if (profileError) {
          console.error('❌ Profile fetch error on auth change:', profileError);
          setProfile(null);
        } else {
          console.log('✅ Profile updated:', profileData);
          setProfile(profileData || null);
        }
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