import test from 'node:test'
import assert from 'node:assert/strict'
import { BASE_MERIT_POINTS, displayMeritTotal } from '../lib/meritTotals.js'

test('displayMeritTotal adds the 100 point student baseline', () => {
  assert.equal(BASE_MERIT_POINTS, 100)
  assert.equal(displayMeritTotal(20), 120)
  assert.equal(displayMeritTotal(-5), 95)
  assert.equal(displayMeritTotal(null), 100)
})
