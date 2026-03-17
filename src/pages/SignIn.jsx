import React, { useState, useEffect } from 'react';
import { supabase } from '../components/lib/supabaseClient';
import { GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const reason = sessionStorage.getItem('auth_redirect_reason');
    if (reason) {
      sessionStorage.removeItem('auth_redirect_reason');
      if (reason === 'idle_timeout') {
        setMessage('Your session expired due to inactivity. Please sign in again.');
      } else if (reason === 'session_error' || reason === 'session_expired') {
        setMessage('Your session expired. Please sign in again.');
      }
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/Dashboard');
    });
  }, [navigate]);

  const checkProfileAndRedirect = async (userId) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('status, organization_id')
      .eq('auth_user_id', userId)
      .maybeSingle();
    if (!profile || !profile.organization_id || (profile.status !== 'approved' && profile.status !== 'active')) {
      navigate('/AccessPending');
    } else {
      navigate('/Dashboard');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/SignIn?oauth_callback=1' },
    });
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_callback')) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) await checkProfileAndRedirect(session.user.id);
      });
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: "#000000", fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Card */}
      <div
        className="w-full flex flex-col items-center"
        style={{
          maxWidth: 420,
          background: "#141414",
          borderRadius: 16,
          boxShadow: "0 4px 32px rgba(0,0,0,0.5)",
          padding: "32px 40px 32px",
          border: "1px solid #2a2a2a",
        }}
      >
        {/* Logo */}
        <img
          src="https://media.base44.com/images/public/69b2f65ec8ee0dde1fce1074/8eb22fe87_GrowProAgencyLogo_Darkcopy.png"
          alt="Grow Pro Agency"
          style={{ width: 200, height: "auto", display: "block", margin: "32px auto 24px", overflow: "visible", flexShrink: 0 }}
        />

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginBottom: 6, textAlign: "center" }}>
          Welcome Back
        </h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 28, textAlign: "center" }}>
          Sign in to Academy Compass
        </p>

        {/* Session expired message */}
        {message && (
          <div
            className="w-full mb-4 p-3 rounded-lg text-sm"
            style={{ background: "#1e3a5f", color: "#93C5FD", border: "1px solid #1d4ed8" }}
          >
            {message}
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleGoogleLogin}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 transition-all"
          style={{
            height: 44,
            borderRadius: 10,
            border: "1px solid #333333",
            background: "#1f1f1f",
            cursor: isLoading ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 600,
            color: "#ffffff",
            opacity: isLoading ? 0.6 : 1,
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "#22C55E"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,197,94,0.15)"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.boxShadow = "none"; }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          {isLoading ? "Signing in..." : "Continue with Google"}
        </button>
      </div>

      {/* Footer */}
      <p className="mt-6 text-xs" style={{ color: "#4B5563" }}>
        Powered by Grow Pro Agency
      </p>
    </div>
  );
}