'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { useTheme } from '@/app/provider/ThemeContext'

function PostSurveyContent() {
  const { t, mode } = useTheme()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [experience, setExperience] = useState('')
  const [participation, setParticipation] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const programmeId = searchParams.get('programme_id')

  const stickyBg = mode === 'dark' ? 'rgba(7,14,26,0.88)' : 'rgba(241,245,249,0.88)'

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = {
      familiarity:   (form[0] as HTMLSelectElement).value,
      expectations:  (form[1] as HTMLTextAreaElement).value,
      experience,
      participation,
      skills:        (form[2] as HTMLTextAreaElement).value,
      suggestions:   (form[3] as HTMLTextAreaElement).value,
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { error: surveyError } = await supabase.from('surveys').insert([{
      type:         'post',
      answers:      data,
      completed:    true,
      user_id:      user.id,
      programme_id: programmeId,
    }])

    if (surveyError) {
      setError('Failed to submit survey. Please try again.')
      setLoading(false)
      return
    }

    const { data: { session } } = await supabase.auth.getSession()
    await fetch('/api/merit/award', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ programme_id: programmeId }),
    })

    setLoading(false)
    setSubmitted(true)
    setTimeout(() => router.push('/student/attendance'), 2500)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", flexDirection: 'column', gap: '0' }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        @keyframes pop { 0%{transform:scale(0.7);opacity:0} 70%{transform:scale(1.1)} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        `}</style>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: t.successBg, border: `1px solid ${t.successBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', animation: 'pop 0.5s ease both' }}>
            <CheckCircle size={40} color={t.success} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '26px', fontWeight: 800, color: t.text, fontFamily: "'Sora', sans-serif", animation: 'fadeUp 0.4s 0.2s ease both', opacity: 0 }}>All done!</h2>
          <p style={{ margin: '0 0 6px', fontSize: '14px', color: t.textFaint, animation: 'fadeUp 0.4s 0.3s ease both', opacity: 0 }}>Thanks for completing the post-survey.</p>
          <p style={{ margin: 0, fontSize: '13px', color: t.textFaintest, animation: 'fadeUp 0.4s 0.4s ease both', opacity: 0 }}>Redirecting you back…</p>
        </div>
      </div>
    )
  }

  const experienceOptions = ['Excellent', 'Good', 'Average', 'Poor']
  const expColors: Record<string, { border: string; bg: string; color: string }> = {
    Excellent: { border: 'rgba(16,185,129,0.4)',  bg: 'rgba(16,185,129,0.1)',  color: t.success },
    Good:      { border: 'rgba(96,165,250,0.4)',  bg: 'rgba(96,165,250,0.1)',  color: '#60a5fa' },
    Average:   { border: 'rgba(245,158,11,0.4)',  bg: 'rgba(245,158,11,0.1)',  color: '#f59e0b' },
    Poor:      { border: t.dangerBorder,           bg: t.dangerBg,              color: t.danger },
  }

  const isDisabled = loading || !experience || !participation

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .q-card { animation: fadeUp 0.4s ease both; }
        .survey-select, .survey-textarea {
          width: 100%;
          background: ${t.bgInput};
          border: 1px solid ${t.borderInput};
          border-radius: 10px;
          padding: 12px 14px;
          color: ${t.text};
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          resize: vertical;
        }
        .survey-select:focus, .survey-textarea:focus {
          border-color: ${t.successBorder};
          background: ${t.successBg};
        }
        .survey-select option { background: ${t.bgCard}; color: ${t.text}; }
        .chip-btn {
          flex: 1;
          min-width: 0;
          padding: 10px 8px;
          border-radius: 9px;
          border: 1px solid ${t.border};
          background: ${t.bgInput};
          color: ${t.textFaint};
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }
        .chip-btn:hover { border-color: ${t.borderInput}; color: ${t.textMuted}; }
        .submit-btn { transition: opacity 0.2s, transform 0.1s, box-shadow 0.2s; }
        .submit-btn:hover:not(:disabled) { opacity: 0.92; transform: translateY(-1px); box-shadow: 0 8px 24px rgba(5,150,105,0.35); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={{ minHeight: '100vh', background: t.bg, fontFamily: "'DM Sans', sans-serif", color: t.text }}>

        {/* Sticky top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: stickyBg, backdropFilter: 'blur(14px)', borderBottom: `1px solid ${t.border}`, padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/student/attendance')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: t.textFaint, fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: t.border }} />
          <span style={{ fontSize: '13px', color: t.textFaint }}>Post-Programme Survey</span>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: '36px', animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: t.successBg, border: `1px solid ${t.successBorder}`, borderRadius: '20px', padding: '4px 12px', marginBottom: '16px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.success }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: t.success, letterSpacing: '0.06em', textTransform: 'uppercase' }}>After the programme</span>
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: t.text, fontFamily: "'Sora', sans-serif", lineHeight: 1.2 }}>
              Post-Programme<br />Survey
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: t.textFaint, lineHeight: 1.6 }}>
              Share your experience and help us improve future programmes.
            </p>
          </div>

          {error && (
            <div style={{ background: t.dangerBg, border: `1px solid ${t.dangerBorder}`, borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: t.danger }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

            {/* Q1 — Familiarity */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>01</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>
                  How familiar are you with the topic <em>after</em> the programme? <span style={{ color: t.success }}>*</span>
                </label>
              </div>
              <select className="survey-select" required>
                <option value="">Select a rating</option>
                <option>1 — Not familiar at all</option>
                <option>2 — Slightly familiar</option>
                <option>3 — Moderately familiar</option>
                <option>4 — Quite familiar</option>
                <option>5 — Very familiar</option>
              </select>
            </div>

            {/* Q2 — Expectations */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0.07s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>02</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>
                  Did the programme meet your expectations? <span style={{ color: t.success }}>*</span>
                </label>
              </div>
              <textarea className="survey-textarea" rows={3} required placeholder="Tell us how it compared to what you expected…" />
            </div>

            {/* Q3 — Overall experience (chip buttons) */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0.14s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>03</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>
                  Overall experience <span style={{ color: t.success }}>*</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {experienceOptions.map(opt => {
                  const selected = experience === opt
                  const c = expColors[opt]
                  return (
                    <button
                      key={opt}
                      type="button"
                      className="chip-btn"
                      onClick={() => setExperience(opt)}
                      style={{
                        flex: '1 1 calc(25% - 6px)',
                        minWidth: '80px',
                        border: selected ? `1px solid ${c.border}` : `1px solid ${t.border}`,
                        background: selected ? c.bg : t.bgInput,
                        color: selected ? c.color : t.textFaint,
                        fontWeight: selected ? 700 : 600,
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
              {!experience && <p style={{ margin: '8px 0 0', fontSize: '11px', color: t.textFaintest }}>Please select one</p>}
            </div>

            {/* Q4 — Active participation (chip buttons) */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0.21s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>04</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>
                  Did you participate actively? <span style={{ color: t.success }}>*</span>
                </label>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['Yes', 'No'].map(opt => {
                  const selected = participation === opt
                  return (
                    <button
                      key={opt}
                      type="button"
                      className="chip-btn"
                      onClick={() => setParticipation(opt)}
                      style={{
                        border: selected ? (opt === 'Yes' ? `1px solid ${t.successBorder}` : `1px solid ${t.dangerBorder}`) : `1px solid ${t.border}`,
                        background: selected ? (opt === 'Yes' ? t.successBg : t.dangerBg) : t.bgInput,
                        color: selected ? (opt === 'Yes' ? t.success : t.danger) : t.textFaint,
                        fontWeight: selected ? 700 : 600,
                      }}
                    >
                      {opt}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Q5 — Skills gained */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0.28s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>05</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>Skills gained</label>
              </div>
              <textarea className="survey-textarea" rows={3} placeholder="What new skills or knowledge did you walk away with?" />
            </div>

            {/* Q6 — Suggestions */}
            <div className="q-card" style={{ background: t.bgCard, border: `1px solid ${t.border}`, borderRadius: '14px', padding: '20px', animationDelay: '0.35s' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: t.textFaintest, fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>06</span>
                <label style={{ fontSize: '14px', fontWeight: 600, color: t.text, lineHeight: 1.5 }}>Suggestions for improvement</label>
              </div>
              <textarea className="survey-textarea" rows={3} placeholder="How could this programme be better next time?" />
            </div>

            <button
              type="submit"
              disabled={isDisabled}
              className="submit-btn"
              style={{
                marginTop: '8px',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: isDisabled
                  ? t.successBg
                  : 'linear-gradient(135deg, #059669, #10b981)',
                color: isDisabled ? t.textFaintest : 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: isDisabled ? 'none' : '0 4px 20px rgba(5,150,105,0.3)',
                animationDelay: '0.42s',
              }}
            >
              {loading ? 'Submitting…' : 'Submit Survey →'}
            </button>

          </form>
        </div>
      </div>
    </>
  )
}

export default function PostSurvey() {
  return (
    <Suspense fallback={null}>
      <PostSurveyContent />
    </Suspense>
  )
}
