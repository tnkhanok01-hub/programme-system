import type { SupabaseClient } from '@supabase/supabase-js'
import { buildMeritTransactionKey } from './meritPolicy.js'

type MeritTransactionType = 'award' | 'demerit' | 'adjustment' | 'revocation' | 'recalculation'

type MeritSourceType =
  | 'participation'
  | 'committee_role'
  | 'manual_adjustment'
  | 'demerit'
  | 'recalculation'

type AwardMeritInput = {
  supabase: SupabaseClient
  userId: string
  programmeId?: string | null
  points: number
  transactionType: MeritTransactionType
  sourceType: MeritSourceType
  sourceRef?: string | null
  role?: string | null
  reason?: string | null
  actorId?: string | null
  programmeName?: string | null
  activityPillar?: string | null
  programmeLevel?: string | null
  metadata?: Record<string, unknown>
}

function supabaseOperationError(operation: string, transactionKey: string, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  return new Error(`${operation} failed for merit transaction ${transactionKey}: ${message}`, {
    cause: error,
  })
}

export async function awardMerit(input: AwardMeritInput) {
  const {
    supabase,
    userId,
    programmeId = null,
    points,
    transactionType,
    sourceType,
    sourceRef = null,
    role = null,
    reason = null,
    actorId = null,
    programmeName = null,
    activityPillar = 'general',
    programmeLevel = 'college',
    metadata = {},
  } = input

  const effectiveSourceRef =
    programmeId === null &&
    (sourceType === 'demerit' || sourceType === 'manual_adjustment') &&
    sourceRef === null
      ? `manual:${crypto.randomUUID()}`
      : sourceRef

  const transactionKey = buildMeritTransactionKey({
    userId,
    programmeId,
    sourceType,
    sourceRef: effectiveSourceRef,
  })

  const { data: tx, error: txError } = await supabase
    .from('merit_transactions')
    .upsert(
      {
        transaction_key: transactionKey,
        user_id: userId,
        programme_id: programmeId,
        points,
        transaction_type: transactionType,
        source_type: sourceType,
        source_ref: effectiveSourceRef,
        role,
        activity_pillar: activityPillar,
        programme_level: programmeLevel,
        reason,
        actor_id: actorId,
        metadata,
      },
      { onConflict: 'transaction_key' }
    )
    .select('id')
    .single()

  if (txError) {
    throw supabaseOperationError('Upserting merit_transactions', transactionKey, txError)
  }

  if (!tx) {
    throw new Error(
      `Upserting merit_transactions returned no transaction row for merit transaction ${transactionKey}.`
    )
  }

  const meritPayload = {
    user_id: userId,
    programme_id: programmeId,
    points,
    status: transactionType === 'demerit' ? 'demerit' : 'awarded',
    reason,
    updated_at: new Date().toISOString(),
  }

  const { error: meritError } = programmeId
    ? await supabase.from('merit').upsert(meritPayload, { onConflict: 'user_id,programme_id' })
    : await supabase.from('merit').insert(meritPayload)

  if (meritError) {
    throw supabaseOperationError('Writing merit compatibility row', transactionKey, meritError)
  }

  if (programmeId && programmeName) {
    const { error: activityError } = await supabase
      .from('student_activity_records')
      .upsert(
        {
          user_id: userId,
          programme_id: programmeId,
          merit_transaction_id: tx.id,
          programme_name: programmeName,
          role,
          activity_pillar: activityPillar,
          programme_level: programmeLevel,
          points,
          recorded_by: actorId,
        },
        { onConflict: 'merit_transaction_id' }
      )

    if (activityError) {
      throw supabaseOperationError('Upserting student_activity_records', transactionKey, activityError)
    }
  }

  return { transactionId: tx.id, transactionKey }
}
