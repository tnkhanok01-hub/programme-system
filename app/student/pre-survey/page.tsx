'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft, CheckCircle } from 'lucide-react'

function PreSurveyContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const programmeId = searchParams.get('programme_id')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const data = {
      familiarity:  (form[0] as HTMLSelectElement).value,
      expectations: (form[1] as HTMLTextAreaElement).value,
      source:       (form[2] as HTMLSelectElement).value,
      skills:       (form[3] as HTMLTextAreaElement).value,
      suggestions:  (form[4] as HTMLTextAreaElement).value,
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { error: surveyError } = await supabase.from('surveys').insert([{
      type:         'pre',
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

    await supabase.from('attendance').upsert(
      { user_id: user.id, programme_id: programmeId, pre_survey: true },
      { onConflict: 'user_id,programme_id' }
    )

    setLoading(false)
    setSubmitted(true)
    setTimeout(() => router.push('/student/attendance'), 2000)
  }

  if (submitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#070e1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
        <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');`}</style>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <CheckCircle size={36} color="#10b981" />
          </div>
          <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#f1f5f9', fontFamily: "'Sora', sans-serif" }}>Survey submitted!</p>
          <p style={{ margin: '8px 0 0', fontSize: '13px', color: '#475569' }}>Redirecting you back…</p>
        </div>
      </div>
    )
  }

  const questions = [
    {
      label: 'How familiar are you with the programme topic?',
      number: '01',
      type: 'select',
      required: true,
      options: ['Select a rating', '1 — Not familiar at all', '2 — Slightly familiar', '3 — Moderately familiar', '4 — Quite familiar', '5 — Very familiar'],
    },
    {
      label: 'What are your expectations from this programme?',
      number: '02',
      type: 'textarea',
      required: true,
      placeholder: 'Share what you hope to get out of this experience…',
    },
    {
      label: 'How did you hear about this programme?',
      number: '03',
      type: 'select',
      required: true,
      options: ['Select an option', 'WhatsApp', 'Friends', 'Poster', 'Lecturer', 'Other'],
    },
    {
      label: 'What skills do you hope to gain?',
      number: '04',
      type: 'textarea',
      required: false,
      placeholder: 'e.g. leadership, teamwork, technical skills…',
    },
    {
      label: 'Any suggestions before the programme starts?',
      number: '05',
      type: 'textarea',
      required: false,
      placeholder: 'Optional — share any thoughts or concerns…',
    },
  ]

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .q-card {
          animation: fadeUp 0.4s ease both;
        }
        .survey-select, .survey-textarea {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 12px 14px;
          color: #e2e8f0;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.2s, background 0.2s;
          resize: vertical;
        }
        .survey-select:focus, .survey-textarea:focus {
          border-color: rgba(99,102,241,0.5);
          background: rgba(99,102,241,0.04);
        }
        .survey-select option { background: #0c1526; }
        .submit-btn {
          transition: opacity 0.2s, transform 0.1s;
        }
        .submit-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .submit-btn:active:not(:disabled) { transform: translateY(0); }
      `}</style>

      <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'DM Sans', sans-serif", color: '#e2e8f0' }}>

        {/* Top bar */}
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'rgba(7,14,26,0.85)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => router.push('/student/attendance')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#475569', fontSize: '13px', cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.08)' }} />
          <span style={{ fontSize: '13px', color: '#64748b' }}>Pre-Programme Survey</span>
        </div>

        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px 80px' }}>

          {/* Header */}
          <div style={{ marginBottom: '40px', animation: 'fadeUp 0.35s ease both' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '4px 12px', marginBottom: '16px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6366f1' }} />
              <span style={{ fontSize: '11px', fontWeight: 600, color: '#818cf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Before the programme</span>
            </div>
            <h1 style={{ margin: '0 0 8px', fontSize: '28px', fontWeight: 800, color: '#f1f5f9', fontFamily: "'Sora', sans-serif", lineHeight: 1.2 }}>
              Pre-Programme<br />Survey
            </h1>
            <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              Help us understand your starting point. Takes about 2 minutes.
            </p>
          </div>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', padding: '12px 16px', marginBottom: '24px', fontSize: '13px', color: '#f87171' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {questions.map((q, i) => (
              <div
                key={i}
                className="q-card"
                style={{
                  background: '#0c1526',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '14px',
                  padding: '20px',
                  animationDelay: `${i * 0.07}s`,
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#374151', fontFamily: "'Sora', sans-serif", letterSpacing: '0.04em', paddingTop: '2px', flexShrink: 0 }}>{q.number}</span>
                  <label style={{ fontSize: '14px', fontWeight: 600, color: '#cbd5e1', lineHeight: 1.5 }}>
                    {q.label}
                    {q.required && <span style={{ color: '#6366f1', marginLeft: '4px' }}>*</span>}
                  </label>
                </div>

                {q.type === 'select' ? (
                  <select className="survey-select" required={q.required}>
                    {q.options!.map((opt, j) => (
                      <option key={j} value={j === 0 ? '' : opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <textarea
                    className="survey-textarea"
                    rows={3}
                    required={q.required}
                    placeholder={q.placeholder}
                  />
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="submit-btn"
              style={{
                marginTop: '8px',
                padding: '15px',
                borderRadius: '12px',
                border: 'none',
                background: loading ? 'rgba(99,102,241,0.3)' : 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: loading ? '#475569' : 'white',
                fontSize: '15px',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: "'DM Sans', sans-serif",
                boxShadow: loading ? 'none' : '0 4px 20px rgba(79,70,229,0.35)',
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

export default function PreSurvey() {
  return (
    <Suspense fallback={null}>
      <PreSurveyContent />
    </Suspense>
  )
}