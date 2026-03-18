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
  }, []);

  const handleInviteFlow = async (session) => {
    const inviteToken = localStorage.getItem('pendingInviteToken');
    if (!inviteToken) return false;

    // Look up valid, non-expired pending invite
    const now = new Date().toISOString();
    const { data: invite } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', inviteToken)
      .eq('status', 'pending')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .maybeSingle();

    localStorage.removeItem('pendingInviteToken');

    if (!invite) {
      navigate('/AccessPending?reason=no_profile');
      return true;
    }

    // Insert new profile
    await supabase.from('profiles').insert([{
      auth_user_id: session.user.id,
      email: session.user.email,
      full_name: session.user.user_metadata?.full_name || session.user.email,
      organization_id: invite.organization_id,
      role: invite.role,
      status: 'active',
    }]);

    // Mark invite as accepted
    await supabase.from('invitations').update({ status: 'accepted' }).eq('token', inviteToken);

    toast.success('Welcome! Your account has been set up.');
    await supabase.auth.refreshSession();
    navigate('/Dashboard');
    return true;
  };

  const checkProfileAndRedirect = async (session) => {
    // Try invite flow first if a token is stored
    if (localStorage.getItem('pendingInviteToken')) {
      await handleInviteFlow(session);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('status, organization_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    console.log('Profile fetched:', JSON.stringify(profile));

    if (!profile) {
      navigate('/AccessPending?reason=no_profile');
    } else if (profile.status === 'active' && profile.organization_id) {
      navigate('/Dashboard');
    } else if (profile.status === 'pending') {
      navigate('/AccessPending?reason=pending');
    } else {
      // active but no org_id, or any other unexpected state
      navigate('/AccessPending?reason=no_org');
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    // Save invite token before OAuth redirect (localStorage persists across redirects)
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite');
    if (inviteToken) localStorage.setItem('pendingInviteToken', inviteToken);

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
        if (!session) return;

        const pendingToken = localStorage.getItem('pendingInviteToken');
        if (pendingToken) {
          await handleInviteFlow(session);
          return;
        }

        await checkProfileAndRedirect(session);
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
          padding: "24px 40px 32px",
          border: "1px solid #2a2a2a",
        }}
      >
        {/* Logo */}
        <img
          src="https://media.base44.com/images/public/69b2f65ec8ee0dde1fce1074/8eb22fe87_GrowProAgencyLogo_Darkcopy.png"
          alt="Grow Pro Agency"
          style={{ width: 180, height: "auto", display: "block", margin: "-8px auto -8px" }}
        />

        {/* Title */}
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#ffffff", marginTop: 0, marginBottom: 6, paddingTop: 0, lineHeight: 1.2, textAlign: "center" }}>
          Welcome Back
        </h1>
        <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 20, textAlign: "center" }}>
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


    </div>
  );
}