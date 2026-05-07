'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { ArrowLeft } from 'lucide-react'

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '8px',
  padding: '10px 12px',
  color: '#e2e8f0',
  fontSize: '14px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '6px',
  fontSize: '13px',
  fontWeight: 500,
  color: '#94a3b8',
}

function PreSurveyContent() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      role:         (form[3] as HTMLSelectElement).value,
      skills:       (form[4] as HTMLTextAreaElement).value,
      suggestions:  (form[5] as HTMLTextAreaElement).value,
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
      console.error(surveyError)
      setError('Failed to submit survey. Please try again.')
      setLoading(false)
      return
    }

    await supabase.from('attendance').upsert(
      { user_id: user.id, programme_id: programmeId, pre_survey: true },
      { onConflict: 'user_id,programme_id' }
    )

    setLoading(false)
    router.push('/student/attendance')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#070e1a', fontFamily: "'Inter', sans-serif", color: '#f1f5f9', padding: '32px 16px' }}>
      <div style={{ maxWidth: '560px', margin: '0 auto' }}>

        <button
          onClick={() => router.push('/student/attendance')}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', marginBottom: '24px', padding: 0 }}
        >
          <ArrowLeft size={14} /> Back to Attendance
        </button>

        <div style={{ background: '#0c1526', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '28px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>Pre-Programme Survey</h1>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>
            Please complete this survey before the programme starts.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>1. How familiar are you with the programme topic?</label>
              <select style={inputStyle} required>
                <option value="">Select rating</option>
                <option>1 - Not familiar</option>
                <option>2</option>
                <option>3</option>
                <option>4</option>
                <option>5 - Very familiar</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>2. What are your expectations from this programme?</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} required />
            </div>

            <div>
              <label style={labelStyle}>3. How did you hear about this programme?</label>
              <select style={inputStyle} required>
                <option value="">Select option</option>
                <option>WhatsApp</option>
                <option>Friends</option>
                <option>Poster</option>
                <option>Lecturer</option>
                <option>Other</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>4. What is your role in this programme?</label>
              <select style={inputStyle}>
                <option>Participant</option>
                <option>Committee Member</option>
                <option>Observer</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>5. What skills do you hope to gain?</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
            </div>

            <div>
              <label style={labelStyle}>6. Suggestions before programme starts</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: loading ? '#334155' : 'linear-gradient(135deg, #4f46e5, #6366f1)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Submitting...' : 'Submit Pre-Survey'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default function PreSurvey() {
  return (
    <Suspense fallback={null}>
      <PreSurveyContent />
    </Suspense>
  )
}
