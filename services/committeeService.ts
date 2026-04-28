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

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Join failed')

  return data
}

/**
 * Programme Director adds one or more members by matric number or full name.
 *
 * @param entries  Array of { identifier, role } pairs.
 *                 identifier = matric number (e.g. "A22EC0001") OR full name.
 * @returns        Array of per-entry results with status 'added' | 'skipped' | 'not_found' | 'error'.
 */
export async function addCommitteeMembers(
  programmeId: string,
  token: string,
  entries: { identifier: string; role: string }[]
) {
  const res = await fetch(`/api/programmes/${programmeId}/committee`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      programme_id: programmeId,
      add_members: entries,
    }),
  })

  const data = await res.json()
  // 207 Multi-Status is the success code for this action
  if (!res.ok && res.status !== 207) throw new Error(data.error || 'Add members failed')

  return data as {
    results: {
      identifier: string
      role: string
      status: 'added' | 'skipped' | 'not_found' | 'error'
      reason?: string
    }[]
  }
}

export async function removeCommitteeMember(programmeId: string, token: string, memberId: string) {
  const res = await fetch(`/api/programmes/${programmeId}/committee`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      programme_id: programmeId,
      member_id: memberId,
    }),
  })

  if (!res.ok) throw new Error('Remove failed')
}
