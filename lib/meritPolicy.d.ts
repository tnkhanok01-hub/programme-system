export const DIRECTOR_MERIT: 25
export const HIGH_COMMITTEE_MERIT: 15
export const MEMBER_MERIT: 10
export const HIGH_COMMITTEE_ROLES: string[]
export function canonicalCommitteeRole(role: string | null | undefined): string
export function isHighCommitteeRole(role: string | null | undefined): boolean
export function defaultRoleMeritPoints(role: string | null | undefined): number
export function buildMeritTransactionKey(input: {
  userId: string
  programmeId?: string | null
  sourceType: string
  sourceRef?: string | null
}): string
