export type PhaseDoc = {
  id: string
  phase: 'pre' | 'during' | 'post'
  doc_type?: string
  file_url?: string
  [key: string]: any
}
