export async function getDocuments(programmeId: string) {
  const res = await fetch(`/api/programmes/${programmeId}/documents`)
  if (!res.ok) throw new Error('Failed to fetch documents')
  return res.json()
}

export async function uploadDocument(fd: FormData, token: string) {
  const res = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: fd,
  })
  return res
}

export async function deleteDocument(docId: string) {
  const res = await fetch(`/api/documents/${docId}`, {
    method: 'DELETE',
  })

  const data = await res.json().catch(() => null)

  if (!res.ok) throw new Error(data?.error || 'Delete failed')

  return data
}