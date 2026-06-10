import { canonicalCommitteeRole, defaultRoleMeritPoints } from './meritPolicy.js'

export function buildCommitteeMeritAwards({ directorId, committeeMembers }) {
  const awards = []
  const seen = new Set()

  if (directorId) {
    const role = canonicalCommitteeRole('Programme Director')
    awards.push({ userId: directorId, role, points: defaultRoleMeritPoints(role) })
    seen.add(directorId)
  }

  for (const member of committeeMembers ?? []) {
    if (!member?.user_id || member.status !== 'approved' || seen.has(member.user_id)) continue

    const role = canonicalCommitteeRole(member.role)
    awards.push({
      userId: member.user_id,
      role,
      points: defaultRoleMeritPoints(role),
    })
    seen.add(member.user_id)
  }

  return awards
}
