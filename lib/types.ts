export type PhaseDoc = {
  id: string
  phase: 'pre' | 'during' | 'post'
  doc_type?: string

  file_name?: string
  file_path?: string
  programme_id?: string
  created_at?: string

  file_url?: string
  [key: string]: any
}
