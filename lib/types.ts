export type PhaseDoc = {
  id: string
  phase: 'pre' | 'during' | 'post' | 'approval'
  doc_type?: string

  file_name?: string
  file_path?: string
  programme_id?: string
  created_at?: string

  file_url?: string
  [key: string]: any
}

export type CommitteeMember = {
  id: string
  name: string
  role: string
  email?: string
  [key: string]: any
}

export type Phase = 'pre' | 'during' | 'post'

export type OverdueItem = {
  id: string
  name: string
  organiser: string
  end_date: string
  days_overdue: number
}
