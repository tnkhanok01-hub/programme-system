export const DIRECTOR_MERIT = 25
export const HIGH_COMMITTEE_MERIT = 15
export const MEMBER_MERIT = 10

export const HIGH_COMMITTEE_ROLES = [
  'Vice Director - Management',
  'Vice Director - Activity',
  'Secretary',
  'Vice Secretary',
  'Treasurer',
  'Vice Treasurer',
]

function normalizeRole(role) {
  return String(role ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
}

const ROLE_CANONICAL_BY_NORMALIZED = new Map([
  ['programme director', 'Programme Director'],
  ...HIGH_COMMITTEE_ROLES.map((role) => [normalizeRole(role), role]),
])

export function canonicalCommitteeRole(role) {
  const normalized = normalizeRole(role)
  return ROLE_CANONICAL_BY_NORMALIZED.get(normalized) ?? String(role ?? 'Member').trim()
}

export function isHighCommitteeRole(role) {
  return HIGH_COMMITTEE_ROLES.includes(canonicalCommitteeRole(role))
}

export function defaultRoleMeritPoints(role) {
  const canonicalRole = canonicalCommitteeRole(role)
  if (canonicalRole === 'Programme Director') return DIRECTOR_MERIT
  if (isHighCommitteeRole(role)) return HIGH_COMMITTEE_MERIT
  return MEMBER_MERIT
}

export function buildMeritTransactionKey({ userId, programmeId, sourceType, sourceRef }) {
  return [userId, programmeId ?? 'manual', sourceType, sourceRef ?? 'default'].join(':')
}
