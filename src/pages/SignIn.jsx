import React, { useState, useEffect } from 'react';
import { supabase } from '../components/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { GraduationCap, Mail, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

const validatePassword = (value) => {
  if (!value) return 'Password is required.';
  if (value.length < 8) return 'Password must be at least 8 characters.';
  if (/<[^>]*>|<\/[^>]*>/i.test(value)) return 'Password contains invalid characters.';
  return null;
};

const validateEmail = (value) => {
  const trimmed = value.trim();
  if (!trimmed) return 'Email is required.';
  if (!trimmed.includes('@')) return 'Email must contain @.';
  const parts = trimmed.split('@');
  if (parts.length !== 2 || !parts[1].includes('.') || parts[1].endsWith('.')) return 'Email must have a valid domain (e.g. .com).';
  return null;
};

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState(null);
  const [passwordError, setPasswordError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [rateLimitError, setRateLimitError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for redirect reason from auth system
    const reason = sessionStorage.getItem('auth_redirect_reason');
    if (reason) {
      sessionStorage.removeItem('auth_redirect_reason');
      
      if (reason === 'idle_timeout') {
        setMessage({ type: 'info', text: 'Your session expired due to inactivity. Please sign in again.' });
      } else if (reason === 'session_error' || reason === 'session_expired') {
        setMessage({ type: 'info', text: 'Your session expired. Please sign in again.' });
      }
    }
    
    // Check if already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        console.log('✅ User already has valid session, redirecting to Dashboard');
        navigate('/Dashboard');
      }
    });
  }, [navigate]);

  const checkProfileAndRedirect = async (userId) => {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('status, organization_id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (error || !profile || !profile.organization_id || (profile.status !== 'approved' && profile.status !== 'active')) {
      navigate('/AccessPending');
    } else {
      navigate('/Dashboard');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    // Client-side validation
    const clientError = validateEmail(email);
    if (clientError) {
      setEmailError(clientError);
      return;
    }
    setEmailError(null);

    const pwError = validatePassword(password);
    if (pwError) {
      setPasswordError(pwError);
      return;
    }
    setPasswordError(null);

    setIsLoading(true);

    // Server-side validation
    try {
      const { base44 } = await import('@/api/base44Client');
      const [emailRes, pwRes] = await Promise.all([
        base44.functions.invoke('validateEmail', { email: email.trim() }),
        base44.functions.invoke('validatePassword', { password }),
      ]);
      if (!emailRes.data?.valid) {
        setEmailError(emailRes.data?.error || 'Invalid email address.');
        setIsLoading(false);
        return;
      }
      if (!pwRes.data?.valid) {
        setPasswordError(pwRes.data?.error || 'Invalid password.');
        setIsLoading(false);
        return;
      }
    } catch (_) {
      // Server validation failed silently — proceed with Supabase
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    } else {
      toast.success('Login successful!');
      await checkProfileAndRedirect(data.user.id);
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/SignIn?oauth_callback=1',
      },
    });

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
    }
  };

  // Handle Google OAuth redirect callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('oauth_callback')) {
      supabase.auth.getSession().then(async ({ data: { session } }) => {
        if (session) {
          await checkProfileAndRedirect(session.user.id);
        }
      });
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome Back</CardTitle>
          <CardDescription>Sign in to Academy Compass</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'info' ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20' : 
              'bg-red-500/10 text-red-600 border border-red-500/20'
            }`}>
              {message.text}
            </div>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
                  className={`pl-10 ${emailError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                />
              </div>
              {emailError && (
                <p className="text-xs text-red-500 mt-1">{emailError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
                  className={`pl-10 ${passwordError ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  required
                />
              </div>
              {passwordError && (
                <p className="text-xs text-red-500 mt-1">{passwordError}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign in with Google
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}