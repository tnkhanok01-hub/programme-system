import test from 'node:test'
import assert from 'node:assert/strict'
import {
  HIGH_COMMITTEE_ROLES,
  canonicalCommitteeRole,
  isHighCommitteeRole,
  defaultRoleMeritPoints,
  buildMeritTransactionKey,
} from '../lib/meritPolicy.js'

test('HIGH_COMMITTEE_ROLES contains the six approved high committee roles only', () => {
  assert.deepEqual(HIGH_COMMITTEE_ROLES, [
    'Vice Director - Management',
    'Vice Director - Activity',
    'Secretary',
    'Vice Secretary',
    'Treasurer',
    'Vice Treasurer',
  ])
})

test('isHighCommitteeRole recognizes high committee roles', () => {
  assert.equal(isHighCommitteeRole('Vice Director - Management'), true)
  assert.equal(isHighCommitteeRole('Vice Director - Activity'), true)
  assert.equal(isHighCommitteeRole('Secretary'), true)
  assert.equal(isHighCommitteeRole('Vice Secretary'), true)
  assert.equal(isHighCommitteeRole('Treasurer'), true)
  assert.equal(isHighCommitteeRole('Vice Treasurer'), true)
  assert.equal(isHighCommitteeRole('Programme Director'), false)
  assert.equal(isHighCommitteeRole('Logistics'), false)
  assert.equal(isHighCommitteeRole('Member'), false)
})

test('isHighCommitteeRole normalizes role casing and spacing', () => {
  assert.equal(isHighCommitteeRole(' secretary '), true)
  assert.equal(isHighCommitteeRole('VICE SECRETARY'), true)
  assert.equal(isHighCommitteeRole('vice   treasurer'), true)
  assert.equal(canonicalCommitteeRole('vice   director - activity'), 'Vice Director - Activity')
})

test('defaultRoleMeritPoints returns current role merit defaults', () => {
  assert.equal(defaultRoleMeritPoints('Programme Director'), 25)
  assert.equal(defaultRoleMeritPoints('Secretary'), 15)
  assert.equal(defaultRoleMeritPoints('Treasurer'), 15)
  assert.equal(defaultRoleMeritPoints('Member'), 10)
  assert.equal(defaultRoleMeritPoints('Logistics'), 10)
})

test('defaultRoleMeritPoints uses normalized high committee roles', () => {
  assert.equal(defaultRoleMeritPoints(' secretary '), 15)
  assert.equal(defaultRoleMeritPoints('VICE TREASURER'), 15)
})

test('buildMeritTransactionKey is stable for idempotent writes', () => {
  assert.equal(
    buildMeritTransactionKey({
      userId: 'user-1',
      programmeId: 'programme-1',
      sourceType: 'committee_role',
      sourceRef: 'Secretary',
    }),
    'user-1:programme-1:committee_role:Secretary'
  )
})
