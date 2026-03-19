import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/components/lib/SupabaseAuthContext';
import { Home, LogIn } from 'lucide-react';

export default function PageNotFound() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#ffffff', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="text-center space-y-6 max-w-md w-full">
        {/* Big number */}
        <div>
          <p style={{ fontSize: 96, fontWeight: 800, color: '#E2E8F0', lineHeight: 1 }}>404</p>
          <div style={{ height: 3, width: 48, background: '#22C55E', borderRadius: 2, margin: '12px auto 0' }} />
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#1E293B' }}>Page not found</h1>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>
            The page you're looking for doesn't exist or may have been moved.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          {user ? (
            <button
              onClick={() => navigate('/Dashboard')}
              className="flex items-center justify-center gap-2 transition-all"
              style={{
                height: 42, borderRadius: 10, padding: '0 20px',
                background: '#22C55E', color: '#ffffff',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#16A34A'}
              onMouseLeave={e => e.currentTarget.style.background = '#22C55E'}
            >
              <Home className="w-4 h-4" /> Go to Dashboard
            </button>
          ) : (
            <button
              onClick={() => navigate('/SignIn')}
              className="flex items-center justify-center gap-2 transition-all"
              style={{
                height: 42, borderRadius: 10, padding: '0 20px',
                background: '#22C55E', color: '#ffffff',
                border: 'none', cursor: 'pointer',
                fontSize: 14, fontWeight: 600,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#16A34A'}
              onMouseLeave={e => e.currentTarget.style.background = '#22C55E'}
            >
              <LogIn className="w-4 h-4" /> Go to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
}