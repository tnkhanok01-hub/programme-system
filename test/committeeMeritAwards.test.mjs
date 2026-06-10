import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCommitteeMeritAwards } from '../lib/committeeMeritAwards.js'

test('buildCommitteeMeritAwards includes director and currently approved committee only', () => {
  const awards = buildCommitteeMeritAwards({
    directorId: 'director-1',
    committeeMembers: [
      { user_id: 'secretary-1', role: ' secretary ', status: 'approved' },
      { user_id: 'removed-1', role: 'Treasurer', status: 'removed' },
      { user_id: 'pending-1', role: 'Vice Treasurer', status: 'pending' },
      { user_id: 'member-1', role: 'Logistics', status: 'approved' },
      { user_id: 'director-1', role: 'Secretary', status: 'approved' },
    ],
  })

  assert.deepEqual(awards, [
    { userId: 'director-1', role: 'Programme Director', points: 25 },
    { userId: 'secretary-1', role: 'Secretary', points: 15 },
    { userId: 'member-1', role: 'Logistics', points: 10 },
  ])
})

test('buildCommitteeMeritAwards omits director award when no director exists', () => {
  const awards = buildCommitteeMeritAwards({
    directorId: null,
    committeeMembers: [
      { user_id: 'vice-1', role: 'VICE DIRECTOR - ACTIVITY', status: 'approved' },
    ],
  })

  assert.deepEqual(awards, [
    { userId: 'vice-1', role: 'Vice Director - Activity', points: 15 },
  ])
})
