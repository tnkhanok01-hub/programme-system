'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Mail, Lock, User, Phone, Hash, Eye, EyeOff, UserPlus } from 'lucide-react'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [matricNumber, setMatricNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const router = useRouter()

  const handleRegister = async () => {
    setMessage(null)
    setIsLoading(true)

    // ── Client-side validation ───────────────────────────────────────────
    if (!email || !password || !confirmPassword || !fullName || !matricNumber) {
      setMessage({ type: 'error', text: 'Please fill in all required fields.' })
      setIsLoading(false); return
    }

    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      setMessage({ type: 'error', text: 'Only UTM email addresses are allowed (@utm.my or @graduate.utm.my).' })
      setIsLoading(false); return
    }

    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters.' })
      setIsLoading(false); return
    }

    if (password !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match.' })
      setIsLoading(false); return
    }

    // ── API call ─────────────────────────────────────────────────────────
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, full_name: fullName, matric_number: matricNumber, phone }),
    })

    const data = await res.json()

    if (!res.ok) {
      const errMsg: string = data.error ?? ''

      // ── Duplicate email detection ────────────────────────────────────
      const isDuplicate =
        errMsg.toLowerCase().includes('already registered') ||
        errMsg.toLowerCase().includes('already exists') ||
        errMsg.toLowerCase().includes('duplicate') ||
        errMsg.toLowerCase().includes('unique') ||
        errMsg.toLowerCase().includes('user already') ||
        errMsg.toLowerCase().includes('email already') ||
        res.status === 409 || res.status === 400 && errMsg.toLowerCase().includes('registered')

      if (isDuplicate) {
        setMessage({ type: 'error', text: 'This email is already registered. Please log in or use a different email.' })
      } else {
        setMessage({ type: 'error', text: errMsg || 'Registration failed. Please try again.' })
      }

      setIsLoading(false); return
    }

    setMessage({ type: 'success', text: 'Registration successful! Redirecting to login...' })
    setIsLoading(false)
    setTimeout(() => router.push('/login'), 1500)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 13px',
    borderRadius: '9px',
    background: 'rgba(0,0,0,0.03)',
    border: '1px solid rgba(0,0,0,0.12)',
    color: '#0f172a',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    transition: 'border-color 0.15s',
  }

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#475569',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        input:focus { border-color: rgba(99,102,241,0.5) !important; box-shadow: 0 0 0 3px rgba(99,102,241,0.08); }
        input::placeholder { color: #94a3b8; }
        @media (max-width: 640px) { input { font-size: 16px !important; } }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif", color: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div style={{ width: '100%', maxWidth: '400px' }}>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #6366f1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <UserPlus size={20} color="white" />
            </div>
            <h1 style={{ margin: '0 0 4px', fontSize: '22px', fontWeight: 700, color: '#0f172a', letterSpacing: '-0.02em' }}>Create Account</h1>
            <p style={{ margin: 0, fontSize: '13px', color: '#475569' }}>Register with your UTM email</p>
          </div>

          {/* Card */}
          <div style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

            {/* Full Name */}
            <div>
              <label style={labelStyle}><User size={11} />Full Name <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inputStyle} type="text" placeholder="e.g. Ahmad bin Ali" value={fullName}
                onChange={e => setFullName(e.target.value)} disabled={isLoading} />
            </div>

            {/* Matric Number */}
            <div>
              <label style={labelStyle}><Hash size={11} />Matric Number <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inputStyle} type="text" placeholder="e.g. A22EC0001" value={matricNumber}
                onChange={e => setMatricNumber(e.target.value)} disabled={isLoading} />
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}><Mail size={11} />UTM Email <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inputStyle} type="email" placeholder="e.g. ahmad@graduate.utm.my" value={email}
                onChange={e => setEmail(e.target.value)} disabled={isLoading} />
            </div>

            {/* Phone */}
            <div>
              <label style={{ ...labelStyle, gap: '5px' }}>
                <Phone size={11} />Phone Number
                <span style={{ fontSize: '10px', color: '#475569', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span>
              </label>
              <input style={inputStyle} type="tel" inputMode="tel" placeholder="e.g. 0123456789" value={phone}
                onChange={e => setPhone(e.target.value)} disabled={isLoading} />
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}><Lock size={11} />Password <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: '42px' }} type={showPassword ? 'text' : 'password'}
                  placeholder="At least 8 characters" value={password}
                  onChange={e => setPassword(e.target.value)} disabled={isLoading} />
                <button type="button" onClick={() => setShowPassword(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}><Lock size={11} />Confirm Password <span style={{ color: '#dc2626' }}>*</span></label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: '42px', borderColor: confirmPassword && confirmPassword !== password ? 'rgba(220,38,38,0.5)' : undefined }}
                  type={showConfirm ? 'text' : 'password'} placeholder="Re-enter your password" value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)} disabled={isLoading} />
                <button type="button" onClick={() => setShowConfirm(p => !p)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p style={{ margin: '5px 0 0', fontSize: '11px', color: '#dc2626' }}>Passwords do not match</p>
              )}
            </div>

            {/* Message banner */}
            {message && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '8px',
                padding: '11px 14px', borderRadius: '9px',
                background: message.type === 'success' ? 'rgba(5,150,105,0.08)' : 'rgba(220,38,38,0.06)',
                border: `1px solid ${message.type === 'success' ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.2)'}`,
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke={message.type === 'success' ? '#059669' : '#dc2626'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: '1px' }}>
                  {message.type === 'success'
                    ? <><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>
                    : <><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>
                  }
                </svg>
                <p style={{ margin: 0, fontSize: '12px', color: message.type === 'success' ? '#059669' : '#dc2626', lineHeight: 1.5 }}>{message.text}</p>
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleRegister}
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
                ? <><div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />Registering...</>
                : <><UserPlus size={15} />Create Account</>
              }
            </button>

          </div>

          {/* Login link */}
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#475569', marginTop: '20px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#4f46e5', textDecoration: 'none', fontWeight: 500 }}>
              Sign in here
            </Link>
          </p>

        </div>
      </div>
    </>
  )
}
