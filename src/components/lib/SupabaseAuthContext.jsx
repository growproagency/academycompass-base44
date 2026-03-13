import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

// Idle timeout duration: 45 minutes
const IDLE_TIMEOUT_MS = 45 * 60 * 1000;

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
  const idleTimerRef = useRef(null);

  // Reset idle timer
  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
    }

    idleTimerRef.current = setTimeout(async () => {
      console.log('⏰ Idle timeout triggered (45 minutes of inactivity)');
      console.log('🚪 Signing out due to inactivity...');
      
      // Clear state
      setUser(null);
      setProfile(null);
      setSession(null);
      setAuthError(null);
      
      // Sign out from Supabase
      await supabase.auth.signOut();
      
      // Redirect with message
      sessionStorage.setItem('auth_redirect_reason', 'idle_timeout');
      window.location.replace('/SignIn');
    }, IDLE_TIMEOUT_MS);
  }, []);

  // Activity listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      if (session) {
        resetIdleTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
      }
    };
  }, [session, resetIdleTimer]);

  useEffect(() => {
    console.log('🚀 Auth initialization starting...');
    
    // Get initial session and profile
    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        console.log('🔐 Session restore result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          sessionError: sessionError?.message
        });

        if (sessionError) {
          console.error('❌ Session restore error:', sessionError);
          // Clear stale state and redirect
          console.log('🔄 Clearing stale session state, redirecting to Sign In');
          sessionStorage.setItem('auth_redirect_reason', 'session_error');
          setUser(null);
          setProfile(null);
          setSession(null);
          setIsLoadingAuth(false);
          return;
        }

        if (!session) {
          console.log('ℹ️ No active session found');
          setUser(null);
          setProfile(null);
          setSession(null);
          setIsLoadingAuth(false);
          return;
        }

        // Valid session found
        console.log('✅ Valid session restored');
        setSession(session);
        setUser(session.user);

        // Start idle timer
        resetIdleTimer();

        // Fetch user profile
        console.log('🔍 Querying profile with auth_user_id:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        console.log('📊 Profile query result:', {
          found: !!profileData,
          organizationId: profileData?.organization_id,
          status: profileData?.status,
          role: profileData?.role,
          error: profileError?.message
        });

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          setProfile(null);
        } else if (profileData) {
          console.log('✅ Profile loaded successfully');
          setProfile(profileData);
        } else {
          console.warn('⚠️ No profile found for authenticated user');
          setProfile(null);
        }

        setAuthError(null);
      } catch (error) {
        console.error('💥 Auth initialization exception:', error);
        setAuthError(error);
        setUser(null);
        setProfile(null);
        setSession(null);
      } finally {
        console.log('🏁 Auth initialization complete');
        setIsLoadingAuth(false);
      }
    };

    initAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 Auth state changed:', event, session ? 'session present' : 'no session');

      // Handle session expiry or sign out
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED' && !session) {
        console.log('🚪 Session expired or signed out');
        setUser(null);
        setProfile(null);
        setSession(null);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        return;
      }

      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        // Reset idle timer on auth changes
        resetIdleTimer();

        console.log('🔍 Re-querying profile after auth change, user ID:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        console.log('📊 Profile re-query result:', { found: !!profileData, error: profileError?.message });

        if (profileError) {
          console.error('❌ Profile fetch error on auth change:', profileError);
          setProfile(null);
        } else if (profileData) {
          console.log('✅ Profile updated');
          setProfile(profileData);
        } else {
          console.warn('⚠️ No profile found after auth change');
          setProfile(null);
        }
      } else {
        setProfile(null);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [resetIdleTimer]);

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