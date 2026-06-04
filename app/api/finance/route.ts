import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import {
  BUDGET_CATEGORIES,
  PAYMENT_METHODS,
  calculateFinanceSummary,
} from '@/lib/financeMath.js'

const APP_FINANCE_ROLES = ['admin', 'superadmin', 'treasurer']
const PROGRAMME_FINANCE_ROLES = ['Treasurer', 'Vice Treasurer']

type RoleRelation = { name?: string } | { name?: string }[] | null
type ProgrammeRow = {
  id: string
  name: string
  category?: string | null
  organiser?: string | null
  venue?: string | null
  budget?: number | null
  start_date?: string | null
  end_date?: string | null
  status?: string | null
  finance_role?: string | null
}
type ProgrammeRoleRow = {
  role: string
  programmes: ProgrammeRow | ProgrammeRow[] | null
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getAuthContext(req: Request, supabase: ReturnType<typeof makeServiceClient>) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null

  const token = authHeader.replace('Bearer ', '').trim()
  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('full_name, roles(name)')
    .eq('id', user.id)
    .single()

  const roles = profile?.roles as RoleRelation
  const roleName = Array.isArray(roles)
    ? roles[0]?.name
    : roles?.name

  return {
    user,
    profileName: profile?.full_name ?? '',
    appRole: (roleName ?? 'student').toLowerCase(),
  }
}

function isAppFinanceRole(appRole: string) {
  return APP_FINANCE_ROLES.includes(appRole)
}

async function getAccessibleProgrammes(
  supabase: ReturnType<typeof makeServiceClient>,
  userId: string,
  appRole: string
) {
  if (isAppFinanceRole(appRole)) {
    const { data, error } = await supabase
      .from('programmes')
      .select('id, name, category, organiser, venue, budget, start_date, end_date, status')
      .order('start_date', { ascending: false })

    if (error) throw error
    return ((data ?? []) as ProgrammeRow[]).map(programme => ({ ...programme, finance_role: appRole }))
  }

  const { data, error } = await supabase
    .from('programme_roles')
    .select(`
      role,
      programmes (
        id,
        name,
        category,
        organiser,
        venue,
        budget,
        start_date,
        end_date,
        status
      )
    `)
    .eq('user_id', userId)
    .eq('status', 'approved')
    .in('role', PROGRAMME_FINANCE_ROLES)

  if (error) throw error

  return ((data ?? []) as ProgrammeRoleRow[])
    .map((row): ProgrammeRow | null => {
      const programme = Array.isArray(row.programmes) ? row.programmes[0] : row.programmes
      return programme ? { ...programme, finance_role: row.role } : null
    })
    .filter((programme): programme is ProgrammeRow => Boolean(programme?.id))
}

function canAccessProgramme(programmes: ProgrammeRow[], programmeId: string) {
  return programmes.some(programme => programme.id === programmeId)
}

function asPositiveNumber(value: unknown, fallback = 0) {
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return fallback
  return Math.round(number * 100) / 100
}

function asRequiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isFinanceType(value: unknown): value is 'income' | 'expense' {
  return value === 'income' || value === 'expense'
}

async function loadFinanceRecords(supabase: ReturnType<typeof makeServiceClient>, programmeId: string) {
  const [budgetResult, transactionResult] = await Promise.all([
    supabase
      .from('finance_budget_items')
      .select('*')
      .eq('programme_id', programmeId)
      .order('created_at', { ascending: true }),
    supabase
      .from('finance_transactions')
      .select('*')
      .eq('programme_id', programmeId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false }),
  ])

  if (budgetResult.error) throw budgetResult.error
  if (transactionResult.error) throw transactionResult.error

  const budgetItems = budgetResult.data ?? []
  const transactions = transactionResult.data ?? []

  return {
    budgetItems,
    transactions,
    summary: calculateFinanceSummary(budgetItems, transactions),
  }
}

export async function GET(req: Request) {
  try {
    const supabase = makeServiceClient()
    const auth = await getAuthContext(req, supabase)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const programmes = await getAccessibleProgrammes(supabase, auth.user.id, auth.appRole)
    const url = new URL(req.url)
    const requestedProgrammeId = url.searchParams.get('programmeId')
    const selectedProgrammeId = requestedProgrammeId || programmes[0]?.id || ''

    if (!selectedProgrammeId) {
      return NextResponse.json({
        profile: { name: auth.profileName, role: auth.appRole },
        programmes,
        selectedProgramme: null,
        budgetItems: [],
        transactions: [],
        summary: calculateFinanceSummary([], []),
        categories: BUDGET_CATEGORIES,
        paymentMethods: PAYMENT_METHODS,
      })
    }

    if (!canAccessProgramme(programmes, selectedProgrammeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const records = await loadFinanceRecords(supabase, selectedProgrammeId)
    return NextResponse.json({
      profile: { name: auth.profileName, role: auth.appRole },
      programmes,
      selectedProgramme: programmes.find(programme => programme.id === selectedProgrammeId) ?? null,
      ...records,
      categories: BUDGET_CATEGORIES,
      paymentMethods: PAYMENT_METHODS,
    })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const supabase = makeServiceClient()
    const auth = await getAuthContext(req, supabase)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json()
    const programmeId = asRequiredString(body.programme_id)
    const kind = asRequiredString(body.kind)

    if (!programmeId) return NextResponse.json({ error: 'Programme is required.' }, { status: 400 })

    const programmes = await getAccessibleProgrammes(supabase, auth.user.id, auth.appRole)
    if (!canAccessProgramme(programmes, programmeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (kind === 'budget_item') {
      const type = body.type
      const category = asRequiredString(body.category)
      const item = asRequiredString(body.item)
      const quantity = asPositiveNumber(body.quantity, 1)
      const unitAmount = asPositiveNumber(body.unit_amount)
      const notes = asRequiredString(body.notes) || null

      if (!isFinanceType(type)) return NextResponse.json({ error: 'Type must be income or expense.' }, { status: 400 })
      if (!category || !item) return NextResponse.json({ error: 'Category and item are required.' }, { status: 400 })

      const { data, error } = await supabase
        .from('finance_budget_items')
        .insert({
          programme_id: programmeId,
          type,
          category,
          item,
          quantity,
          unit_amount: unitAmount,
          notes,
          created_by: auth.user.id,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ budgetItem: data }, { status: 201 })
    }

    if (kind === 'transaction') {
      const type = body.type
      const category = asRequiredString(body.category)
      const description = asRequiredString(body.description)
      const amount = asPositiveNumber(body.amount)
      const transactionDate = asRequiredString(body.transaction_date) || new Date().toISOString().slice(0, 10)
      const paymentMethod = asRequiredString(body.payment_method) || null
      const receiptUrl = asRequiredString(body.receipt_url) || null
      const remarks = asRequiredString(body.remarks) || null

      if (!isFinanceType(type)) return NextResponse.json({ error: 'Type must be income or expense.' }, { status: 400 })
      if (!category || !description) return NextResponse.json({ error: 'Category and description are required.' }, { status: 400 })
      if (amount <= 0) return NextResponse.json({ error: 'Amount must be more than RM 0.00.' }, { status: 400 })

      const { data, error } = await supabase
        .from('finance_transactions')
        .insert({
          programme_id: programmeId,
          type,
          transaction_date: transactionDate,
          category,
          description,
          amount,
          payment_method: paymentMethod,
          receipt_url: receiptUrl,
          remarks,
          created_by: auth.user.id,
        })
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ transaction: data }, { status: 201 })
    }

    return NextResponse.json({ error: 'Invalid finance record type.' }, { status: 400 })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = makeServiceClient()
    const auth = await getAuthContext(req, supabase)
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const kind = url.searchParams.get('kind')
    const id = url.searchParams.get('id')
    const programmeId = url.searchParams.get('programmeId')

    if (!id || !programmeId) {
      return NextResponse.json({ error: 'Record and programme are required.' }, { status: 400 })
    }

    const programmes = await getAccessibleProgrammes(supabase, auth.user.id, auth.appRole)
    if (!canAccessProgramme(programmes, programmeId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const table = kind === 'transaction'
      ? 'finance_transactions'
      : kind === 'budget_item'
        ? 'finance_budget_items'
        : ''

    if (!table) return NextResponse.json({ error: 'Invalid finance record type.' }, { status: 400 })

    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', id)
      .eq('programme_id', programmeId)

    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (error: unknown) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 })
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (typeof error === 'object' && error && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return 'Server error'
}
