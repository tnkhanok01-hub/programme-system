"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Lock, LogIn, Eye, EyeOff } from "lucide-react";
import { useSearchParams } from 'next/navigation';

export default function Login() {
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage]     = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();
  const searchParams = typeof window !== "undefined" ? useSearchParams() : null;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;
      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("roles(name)")
        .eq("id", user.id)
        .single();

      const role = (userData?.roles as any)?.name;
      if (!role) return;
      if (isMounted) redirectByRole(role);
    };

    if (searchParams?.get('confirmed') === 'true') {
      setMessage({ type: 'success', text: 'Email confirmed! You can now log in.' });
    }
    if (searchParams?.get('error') === 'confirmation_failed') {
      setMessage({ type: 'error', text: 'Confirmation link is invalid or has expired.' });
    }

    checkSession();
    return () => { isMounted = false; };
  }, []);

  const redirectByRole = (role: string) => {
    const path = window.location.pathname;
    if (role === "superadmin" && path !== "/superadmin") {
      router.replace("/superadmin");
    } else if (role === "admin" && path !== "/admin") {
      router.replace("/admin");
    } else if (role !== "admin" && role !== "superadmin" && path !== "/student") {
      router.replace("/student");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setIsLoading(false);
      return;
    }

    const user = data.user;

    const { data: userData } = await supabase
      .from("users")
      .select("roles(name)")
      .eq("id", user.id)
      .single();

    const role = (userData?.roles as any)?.name;

    if (!role) {
      setMessage({ type: 'error', text: 'Account not found.' });
      setIsLoading(false);
      return;
    }

    setMessage({ type: 'success', text: 'Login successful! Redirecting...' });
    redirectByRole(role);
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
              <LogIn size={20} color="white" />
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Welcome Back</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Sign in to your UTM SPMS account</p>
          </div>

          {/* Card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

              {/* Email */}
              <div>
                <label style={labelStyle}><Mail size={11} />UTM Email <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="e.g. ahmad@graduate.utm.my"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Password */}
              <div>
                <label style={labelStyle}><Lock size={11} />Password <span style={{ color: '#ef4444' }}>*</span></label>
                <div style={{ position: 'relative' }}>
                  <input
                    style={{ ...inputStyle, paddingRight: '42px' }}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Forgot password */}
              <div style={{ textAlign: 'right', marginTop: '-8px' }}>
                <Link href="/forgot-password" style={{ fontSize: '12px', color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot Password?
                </Link>
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

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: isLoading ? 'rgba(99,102,241,0.4)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                  color: 'white', fontSize: '14px', fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
              >
                {isLoading
                  ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />Signing in...</>
                  : <><LogIn size={15} />Sign In</>
                }
              </button>

            </form>
          </div>

          {/* Register link */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4b5563', marginTop: '20px' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
              Register here
            </Link>
          </p>

        </div>
      </div>
    </>
  );
}