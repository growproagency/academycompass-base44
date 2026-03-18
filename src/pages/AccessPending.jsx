import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../components/lib/supabaseClient';

const STATES = {
  pending: {
    icon: '⏳',
    title: 'Access Pending',
    description: 'Your account is awaiting approval. You\'ll be notified once an admin reviews your request.',
    color: '#F59E0B',
    bg: '#1c1500',
    border: '#78350f',
  },
  no_profile: {
    icon: '🔍',
    title: 'Profile Not Found',
    description: 'We couldn\'t find a profile linked to your account. Please contact your administrator to get access.',
    color: '#94A3B8',
    bg: '#0f172a',
    border: '#1e293b',
  },
  no_org: {
    icon: '🚫',
    title: 'Access Not Authorized',
    description: 'Your account is not linked to any organization. Please contact your administrator.',
    color: '#EF4444',
    bg: '#1c0000',
    border: '#7f1d1d',
  },
};

export default function AccessPending() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const reason = params.get('reason') || 'pending';
  const state = STATES[reason] || STATES.pending;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/SignIn');
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: '#000000', fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div
        className="w-full flex flex-col items-center text-center"
        style={{
          maxWidth: 440,
          background: '#141414',
          borderRadius: 16,
          boxShadow: '0 4px 32px rgba(0,0,0,0.5)',
          padding: '40px',
          border: '1px solid #2a2a2a',
        }}
      >
        {/* Logo */}
        <img
          src="https://media.base44.com/images/public/69b2f65ec8ee0dde1fce1074/8eb22fe87_GrowProAgencyLogo_Darkcopy.png"
          alt="Grow Pro Agency"
          style={{ width: 160, height: 'auto', marginBottom: 28 }}
        />

        {/* Icon */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: state.bg,
            border: `1px solid ${state.border}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            marginBottom: 20,
          }}
        >
          {state.icon}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#ffffff', marginBottom: 10 }}>
          {state.title}
        </h1>

        {/* Description */}
        <p style={{ fontSize: 14, color: '#94A3B8', lineHeight: 1.6, marginBottom: 28 }}>
          {state.description}
        </p>

        {/* Sign out button */}
        <button
          onClick={handleSignOut}
          style={{
            height: 40,
            borderRadius: 8,
            border: '1px solid #333333',
            background: '#1f1f1f',
            color: '#94A3B8',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            padding: '0 20px',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#555'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#333333'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}