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
    let mounted = true;
    
    // Get initial session and profile
    const initAuth = async () => {
      try {
        console.log('📡 Calling supabase.auth.getSession()...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (!mounted) {
          console.log('⚠️ Component unmounted during session fetch, aborting');
          return;
        }
        
        console.log('🔐 getSession() result:', {
          hasSession: !!session,
          userId: session?.user?.id,
          email: session?.user?.email,
          expiresAt: session?.expires_at,
          sessionError: sessionError?.message
        });

        if (sessionError) {
          console.error('❌ Session restore error:', sessionError);
          // Only redirect for actual errors, not missing sessions
          console.log('🔄 Session error detected, clearing state');
          sessionStorage.setItem('auth_redirect_reason', 'session_error');
          setUser(null);
          setProfile(null);
          setSession(null);
          setAuthError(sessionError);
          setIsLoadingAuth(false);
          return;
        }

        if (!session) {
          console.log('ℹ️ No active session found - user needs to sign in');
          setUser(null);
          setProfile(null);
          setSession(null);
          setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }

        // Valid session found
        console.log('✅ Valid session restored, setting auth state');
        setSession(session);
        setUser(session.user);
        setAuthError(null);

        // Start idle timer
        resetIdleTimer();

        // Fetch user profile
        console.log('🔍 Fetching profile for auth_user_id:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!mounted) {
          console.log('⚠️ Component unmounted during profile fetch, aborting');
          return;
        }

        console.log('📊 Profile query completed:', {
          found: !!profileData,
          organizationId: profileData?.organization_id,
          status: profileData?.status,
          role: profileData?.role,
          errorCode: profileError?.code,
          errorMessage: profileError?.message
        });

        if (profileError) {
          console.error('❌ Profile fetch error:', profileError);
          setProfile(null);
        } else if (profileData) {
          console.log('✅ Profile loaded and set successfully');
          setProfile(profileData);
        } else {
          console.warn('⚠️ No profile record found for authenticated user');
          setProfile(null);
        }
      } catch (error) {
        console.error('💥 Auth initialization exception:', error);
        setAuthError(error);
        setUser(null);
        setProfile(null);
        setSession(null);
      } finally {
        if (mounted) {
          console.log('🏁 Auth initialization complete, setting isLoadingAuth = false');
          setIsLoadingAuth(false);
        }
      }
    };

    initAuth();
    
    return () => {
      mounted = false;
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('🔄 onAuthStateChange fired:', {
        event,
        hasSession: !!session,
        userId: session?.user?.id,
        email: session?.user?.email
      });

      // Handle session expiry or sign out
      if (event === 'SIGNED_OUT') {
        console.log('🚪 SIGNED_OUT event - clearing all auth state');
        setUser(null);
        setProfile(null);
        setSession(null);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        console.log('🔄 TOKEN_REFRESHED but no session - session likely expired');
        sessionStorage.setItem('auth_redirect_reason', 'session_expired');
        setUser(null);
        setProfile(null);
        setSession(null);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
        return;
      }

      // Update session state
      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        // Reset idle timer on auth changes
        resetIdleTimer();

        console.log('🔍 Auth change with session - re-querying profile for user:', session.user.id);
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        console.log('📊 Profile re-query after auth change:', {
          found: !!profileData,
          organizationId: profileData?.organization_id,
          status: profileData?.status,
          error: profileError?.message
        });

        if (profileError) {
          console.error('❌ Profile fetch error on auth change:', profileError);
          setProfile(null);
        } else if (profileData) {
          console.log('✅ Profile updated after auth change');
          setProfile(profileData);
        } else {
          console.warn('⚠️ No profile found after auth change');
          setProfile(null);
        }
      } else {
        console.log('ℹ️ Auth change with no session - clearing profile');
        setProfile(null);
        if (idleTimerRef.current) {
          clearTimeout(idleTimerRef.current);
        }
      }
    });

    return () => {
      console.log('🧹 Cleaning up auth state change subscription');
      subscription.unsubscribe();
    };
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
    const adminCheck = profile?.role?.toLowerCase() === 'admin';
    console.log('🔑 isAdmin() check:', { 
      hasProfile: !!profile, 
      profileRole: profile?.role, 
      result: adminCheck 
    });
    return adminCheck;
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