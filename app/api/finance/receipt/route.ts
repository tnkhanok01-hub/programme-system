import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { isAppFinanceRole, PROGRAMME_FINANCE_ROLES } from '@/lib/financeAccess.js'

type RoleRelation = { name?: string } | { name?: string }[] | null

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(req: Request) {
  try {
    const supabase = makeServiceClient()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '').trim()
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const programmeId = (formData.get('programme_id') as string | null)?.trim() ?? ''

    if (!file || !programmeId) {
      return NextResponse.json({ error: 'Missing file or programme.' }, { status: 400 })
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File must be 10MB or smaller.' }, { status: 400 })
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF files are accepted.' }, { status: 400 })
    }

    const { data: profile } = await supabase
      .from('users')
      .select('roles(name)')
      .eq('id', user.id)
      .single()

    const roles = profile?.roles as RoleRelation
    const roleName = Array.isArray(roles) ? roles[0]?.name : roles?.name
    const appRole = (roleName ?? 'student').toLowerCase()

    let allowed = isAppFinanceRole(appRole)
    if (!allowed) {
      const { data: committeeEntry } = await supabase
        .from('programme_roles')
        .select('role')
        .eq('programme_id', programmeId)
        .eq('user_id', user.id)
        .eq('status', 'approved')
        .in('role', PROGRAMME_FINANCE_ROLES)
        .maybeSingle()
      allowed = Boolean(committeeEntry)
    }

    if (!allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `finance-receipts/${programmeId}/${Date.now()}-${safeName}`

    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file)
    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${filePath}`
    return NextResponse.json({ url, path: filePath })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
