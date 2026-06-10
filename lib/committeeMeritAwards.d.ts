export type CommitteeMeritMember = {
  user_id: string | null
  role: string | null
  status: string | null
}

export type CommitteeMeritAward = {
  userId: string
  role: string
  points: number
}

export function buildCommitteeMeritAwards(input: {
  directorId?: string | null
  committeeMembers?: CommitteeMeritMember[] | null
}): CommitteeMeritAward[]
