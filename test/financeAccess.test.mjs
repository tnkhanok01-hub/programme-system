import test from 'node:test'
import assert from 'node:assert/strict'
import { canUseProgrammeFinance, isProgrammeFinanceRole } from '../lib/financeAccess.js'

test('isProgrammeFinanceRole recognizes treasurer committee roles', () => {
  assert.equal(isProgrammeFinanceRole('Treasurer'), true)
  assert.equal(isProgrammeFinanceRole('Vice Treasurer'), true)
  assert.equal(isProgrammeFinanceRole('Secretary'), false)
})

test('canUseProgrammeFinance allows admins and programme treasurers only', () => {
  assert.equal(canUseProgrammeFinance({ appRole: 'admin' }), true)
  assert.equal(canUseProgrammeFinance({ appRole: 'superadmin' }), true)
  assert.equal(canUseProgrammeFinance({ appRole: 'student', programmeRole: 'Treasurer' }), true)
  assert.equal(canUseProgrammeFinance({ appRole: 'student', programmeRole: 'Vice Treasurer' }), true)
  assert.equal(canUseProgrammeFinance({ appRole: 'student', programmeRole: 'Programme Director' }), false)
  assert.equal(canUseProgrammeFinance({ appRole: 'student', programmeRole: 'Secretary' }), false)
})
