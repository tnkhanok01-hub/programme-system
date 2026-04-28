"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import { Lock, Eye, EyeOff, KeyRound } from "lucide-react";

export default function UpdatePassword() {
  const [password, setPassword]             = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword]     = useState(false);
  const [showConfirm, setShowConfirm]       = useState(false);
  const [message, setMessage]               = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [isLoading, setIsLoading]           = useState(false);
  const [ready, setReady]                   = useState(false);

  const router = useRouter();

  useEffect(() => {
    const handleSession = async () => {
      try {
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.replace("#", ""));
          const access_token  = params.get("access_token");
          const refresh_token = params.get("refresh_token");
          const type          = params.get("type");

          if (access_token && refresh_token && type === "recovery") {
            const { error } = await supabase.auth.setSession({ access_token, refresh_token });
            if (error) { setMessage({ type: 'error', text: error.message }); return; }
            window.history.replaceState({}, document.title, "/update-password");
            setReady(true); return;
          }
        }

        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) { setMessage({ type: 'error', text: error.message }); return; }
          window.history.replaceState({}, document.title, "/update-password");
          setReady(true); return;
        }

        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData.session) { setReady(true); return; }

        setMessage({ type: 'error', text: 'Invalid or expired reset link.' });
      } catch {
        setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
      }
    };

    handleSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!password || !confirmPassword) {
      setMessage({ type: 'error', text: 'Please fill in all fields.' }); return;
    }
    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' }); return;
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' }); return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage({ type: 'error', text: error.message });
      setIsLoading(false); return;
    }

    setMessage({ type: 'success', text: 'Password updated successfully! Redirecting to login...' });
    await supabase.auth.signOut();
    setTimeout(() => router.push("/login"), 1500);
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
              <KeyRound size={20} color="white" />
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.02em' }}>Update Password</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#4b5563' }}>Enter your new password below</p>
          </div>

          {/* Card */}
          <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Validating state */}
            {!ready && !message && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '16px 0' }}>
                <div style={{ width: '16px', height: '16px', borderRadius: '50%', border: '2px solid rgba(99,102,241,0.3)', borderTopColor: '#6366f1', animation: 'spin 0.8s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>Validating reset link...</p>
              </div>
            )}

            {/* Error before ready (bad link) */}
            {!ready && message && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '11px 14px', borderRadius: '9px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.25)',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p style={{ margin: 0, fontSize: '12px', color: '#ef4444', lineHeight: 1.5 }}>{message.text}</p>
              </div>
            )}

            {/* Form — only shown when ready */}
            {ready && (
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

                {/* New Password */}
                <div>
                  <label style={labelStyle}><Lock size={11} />New Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inputStyle, paddingRight: '42px' }}
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowPassword(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label style={labelStyle}><Lock size={11} />Confirm Password <span style={{ color: '#ef4444' }}>*</span></label>
                  <div style={{ position: 'relative' }}>
                    <input
                      style={{ ...inputStyle, paddingRight: '42px', borderColor: confirmPassword && confirmPassword !== password ? 'rgba(239,68,68,0.5)' : undefined }}
                      type={showConfirm ? 'text' : 'password'}
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      disabled={isLoading}
                    />
                    <button type="button" onClick={() => setShowConfirm(p => !p)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                      {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  {confirmPassword && confirmPassword !== password && (
                    <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#ef4444' }}>Passwords do not match</p>
                  )}
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
                    ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />Updating...</>
                    : <><KeyRound size={15} />Update Password</>
                  }
                </button>

              </form>
            )}
          </div>

          {/* Back to login */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#4b5563', marginTop: '20px' }}>
            Remember your password?{' '}
            <a href="/login" style={{ color: '#818cf8', textDecoration: 'none', fontWeight: 500 }}>
              Back to Login
            </a>
          </p>

        </div>
      </div>
    </>
  );
}