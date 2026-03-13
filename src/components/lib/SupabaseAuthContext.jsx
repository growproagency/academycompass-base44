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
            .select('*')
            .eq('auth_user_id', session.user.id)
            .maybeSingle();

          console.log('📊 Profile query result:', { profileData, profileError });

          if (profileError) {
            console.error('❌ Profile fetch error:', profileError);
            setProfile(null);
          } else if (profileData) {
            console.log('✅ Profile loaded successfully:', profileData);
            setProfile(profileData);
          } else {
            console.warn('⚠️ No profile found for this user');
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
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        console.log('📊 Profile re-query result:', { profileData, profileError });

        if (profileError) {
          console.error('❌ Profile fetch error on auth change:', profileError);
          setProfile(null);
        } else if (profileData) {
          console.log('✅ Profile updated:', profileData);
          setProfile(profileData);
        } else {
          console.warn('⚠️ No profile found after auth change');
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAuthorized = () => {
    if (!profile) {
      console.log('⛔ Not authorized: No profile');
      return false;
    }
    if (!profile.organization_id) {
      console.log('⛔ Not authorized: No organization_id');
      return false;
    }
    if (profile.status !== 'approved' && profile.status !== 'active') {
      console.log('⛔ Not authorized: Status is', profile.status);
      return false;
    }
    console.log('✅ User is authorized');
    return true;
  };

  const isAdmin = () => {
    return profile?.role === 'admin';
  };

  const navigateToLogin = () => {
    window.location.href = '/SignIn';
  };

  const signOut = async () => {
    try {
      console.log('🚪 Signing out...');
      
      // Clear state immediately
      setUser(null);
      setProfile(null);
      setSession(null);
      setAuthError(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('❌ Sign out error:', error);
      }
      console.log('✅ Sign out successful, redirecting...');
      
      // Force redirect even if error
      window.location.replace('/SignIn');
    } catch (error) {
      console.error('💥 Sign out failed:', error);
      // Still redirect on failure
      window.location.replace('/SignIn');
    }
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
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};