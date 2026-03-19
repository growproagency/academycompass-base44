import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabaseClient';

const AuthContext = createContext({});

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

  const resetIdleTimer = useCallback(() => {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(async () => {
      setUser(null);
      setProfile(null);
      setSession(null);
      setAuthError(null);
      await supabase.auth.signOut();
      sessionStorage.setItem('auth_redirect_reason', 'idle_timeout');
      window.location.replace('/SignIn');
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    const handleActivity = () => { if (session) resetIdleTimer(); };
    events.forEach(e => document.addEventListener(e, handleActivity, true));
    return () => {
      events.forEach(e => document.removeEventListener(e, handleActivity, true));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [session, resetIdleTimer]);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (!mounted) return;

        if (sessionError) {
          sessionStorage.setItem('auth_redirect_reason', 'session_error');
          setUser(null); setProfile(null); setSession(null); setAuthError(sessionError);
          setIsLoadingAuth(false);
          return;
        }

        if (!session) {
          setUser(null); setProfile(null); setSession(null); setAuthError(null);
          setIsLoadingAuth(false);
          return;
        }

        setSession(session);
        setUser(session.user);
        setAuthError(null);
        resetIdleTimer();

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!mounted) return;

        if (!profileError && profileData) setProfile(profileData);
        else setProfile(null);
      } catch (error) {
        setAuthError(error);
        setUser(null); setProfile(null); setSession(null);
      } finally {
        if (mounted) setIsLoadingAuth(false);
      }
    };

    initAuth();
    return () => { mounted = false; };
  }, [resetIdleTimer]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null); setProfile(null); setSession(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && !session) {
        sessionStorage.setItem('auth_redirect_reason', 'session_expired');
        setUser(null); setProfile(null); setSession(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
        return;
      }

      setSession(session);
      setUser(session?.user || null);

      if (session?.user) {
        resetIdleTimer();
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('auth_user_id', session.user.id)
          .maybeSingle();

        if (!profileError && profileData) setProfile(profileData);
        else setProfile(null);
      } else {
        setProfile(null);
        if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      }
    });

    return () => subscription.unsubscribe();
  }, [resetIdleTimer]);

  const isAuthorized = () => {
    if (!profile || !profile.organization_id) return false;
    return profile.status === 'approved' || profile.status === 'active';
  };

  const isAdmin = () => profile?.role?.toLowerCase() === 'admin';

  const navigateToLogin = () => { window.location.href = '/SignIn'; };

  const signOut = async () => {
    setUser(null); setProfile(null); setSession(null); setAuthError(null);
    await supabase.auth.signOut();
    window.location.replace('/SignIn');
  };

  return (
    <AuthContext.Provider value={{
      user, profile, session, isLoadingAuth,
      isLoadingPublicSettings: false,
      authError, isAuthorized, isAdmin, navigateToLogin, signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};