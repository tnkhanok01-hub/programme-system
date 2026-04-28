export async function getProgramme(id: string, token: string) {
  const res = await fetch(`/api/programmes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch programme')
  return res.json()
}

export async function getCommittee(programmeId: string, token: string) {
  const res = await fetch(`/api/programmes/${programmeId}/committee`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Failed to fetch committee')
  return res.json()
}

export async function joinCommittee(programmeId: string, token: string, role: string) {
  const res = await fetch(`/api/programmes/${programmeId}/committee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      programme_id: programmeId,
      join_self: true,
      member_role: role,
    }),
  })
  return res.json()
}

export async function leaveCommittee(programmeId: string, token: string, memberId: string) {
  return fetch(`/api/programmes/${programmeId}/committee`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ programme_id: programmeId, member_id: memberId }),
  })
}