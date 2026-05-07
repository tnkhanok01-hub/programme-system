'use client'

import { Suspense, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { validateAttendance } from '@/lib/attendance'
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

function PostSurveyContent() {
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
      familiarity:   (form[0] as HTMLSelectElement).value,
      expectations:  (form[1] as HTMLTextAreaElement).value,
      experience:    (form[2] as HTMLSelectElement).value,
      participation: (form[3] as HTMLSelectElement).value,
      skills:        (form[4] as HTMLTextAreaElement).value,
      suggestions:   (form[5] as HTMLTextAreaElement).value,
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
      console.error(surveyError)
      setError('Failed to submit survey. Please try again.')
      setLoading(false)
      return
    }

    await supabase.from('attendance').upsert(
      { user_id: user.id, programme_id: programmeId, post_survey: true },
      { onConflict: 'user_id,programme_id' }
    )

    const { data: attRow } = await supabase
      .from('attendance')
      .select('qr_start, qr_end, pre_survey, post_survey')
      .eq('user_id', user.id)
      .eq('programme_id', programmeId)
      .maybeSingle()

    if (attRow && validateAttendance(attRow) === 'valid') {
      await supabase.from('merit').upsert(
        {
          user_id:      user.id,
          programme_id: programmeId,
          points:       1,
          status:       'awarded',
          updated_at:   new Date().toISOString(),
        },
        { onConflict: 'user_id,programme_id' }
      )
    }

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
          <h1 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 700, color: '#f1f5f9' }}>Post-Programme Survey</h1>
          <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#64748b' }}>
            Please complete this survey after the programme ends.
          </p>

          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#ef4444' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

            <div>
              <label style={labelStyle}>1. How familiar are you with the topic after the programme?</label>
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
              <label style={labelStyle}>2. Did the programme meet your expectations?</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} required />
            </div>

            <div>
              <label style={labelStyle}>3. Overall experience</label>
              <select style={inputStyle}>
                <option>Excellent</option>
                <option>Good</option>
                <option>Average</option>
                <option>Poor</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>4. Did you participate actively?</label>
              <select style={inputStyle}>
                <option>Yes</option>
                <option>No</option>
              </select>
            </div>

            <div>
              <label style={labelStyle}>5. Skills gained</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
            </div>

            <div>
              <label style={labelStyle}>6. Suggestions for improvement</label>
              <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ padding: '12px', borderRadius: '10px', border: 'none', background: loading ? '#334155' : 'linear-gradient(135deg, #059669, #10b981)', color: 'white', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Submitting...' : 'Submit Post-Survey'}
            </button>

          </form>
        </div>
      </div>
    </div>
  )
}

export default function PostSurvey() {
  return (
    <Suspense fallback={null}>
      <PostSurveyContent />
    </Suspense>
  )
}
