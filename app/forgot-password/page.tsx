'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Send, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [message, setMessage]   = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('roles(name)')
        .eq('id', user.id)
        .single();

      const role = (userData?.roles as any)?.name;
      if (!role) return;

      if (role === 'superadmin') router.replace('/superadmin');
      else if (role === 'admin') router.replace('/admin');
      else router.replace('/student');
    };

    checkSession();
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setMessage({ type: 'error', text: data.error });
      if (res.status === 429) setCooldown(60);
    } else {
      setMessage({ type: 'success', text: data.message });
      setCooldown(60);
    }

    setIsLoading(false);
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: '9px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.09)',
    color: '#e2e8f0',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#6b7280',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  const isDisabled = isLoading || cooldown > 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        input::placeholder { color: #374151; }
        @media (max-width: 640px) { input { font-size: 16px !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'Inter', sans-serif", color: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Mail size={20} color="white" />
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Reset Password</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Enter your UTM email and we'll send you a reset link</p>
          </div>

          {/* Card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div>
                <label style={labelStyle}><Mail size={11} />UTM Email Address <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="e.g. ahmad@graduate.utm.my"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isDisabled}
                />
              </div>

              {/* Message banner */}
              {message && (
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: '8px',
                  padding: '11px 14px', borderRadius: '9px',
                  background: message.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.08)',
                  border: `1px solid ${message.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}`,
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                    stroke={message.type === 'success' ? '#10b981' : '#ef4444'}
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    style={{ flexShrink: 0, marginTop: '1px' }}>
                    {message.type === 'success'
                      ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                      : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                    }
                  </svg>
                  <p style={{ margin: 0, fontSize: '12px', color: message.type === 'success' ? '#10b981' : '#ef4444', lineHeight: 1.5 }}>{message.text}</p>
                </div>
              )}

              {/* Cooldown notice */}
              {cooldown > 0 && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '11px 14px', borderRadius: '9px',
                  background: 'rgba(245,158,11,0.08)',
                  border: '1px solid rgba(245,158,11,0.2)',
                }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p style={{ margin: 0, fontSize: '12px', color: '#f59e0b', lineHeight: 1.5 }}>
                    You can resend in <strong>{cooldown}s</strong>
                  </p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isDisabled}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: isDisabled ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: 'white', fontSize: '14px', fontWeight: 600,
                  cursor: isDisabled ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {isLoading
                  ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />Sending...</>
                  : <><Send size={15} />{cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Reset Link'}</>
                }
              </button>

            </form>
          </div>

          {/* Back to login */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4b5563', marginTop: '20px' }}>
            <Link href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <ArrowLeft size={13} />Back to Login
            </Link>
          </p>

        </div>
      </div>
    </>
  );
}