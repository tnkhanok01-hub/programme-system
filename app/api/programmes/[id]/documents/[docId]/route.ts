// app/api/programmes/[id]/documents/[docId]/route.ts
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  const auth = request.headers.get('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = auth.replace('Bearer ', '')

  const svc = makeServiceClient()
  const { data: { user }, error: authError } = await svc.auth.getUser(token)
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: userData } = await svc
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single()
  const callerRole = (userData?.roles as any)?.name?.toLowerCase() ?? ''
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id: programmeId, docId } = await params

  // If admin, ensure they are the assigned advisor
  if (callerRole === 'admin') {
    const { data: prog } = await svc
      .from('programmes')
      .select('advisor_id')
      .eq('id', programmeId)
      .single()
    if (!prog || prog.advisor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  }

  const { data: doc, error: fetchError } = await svc
    .from('programme_documents')
    .select('file_path')
    .eq('id', docId)
    .eq('programme_id', programmeId)
    .single()

  if (fetchError || !doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  await svc.storage.from('documents').remove([doc.file_path])

  const { error: deleteError } = await svc
    .from('programme_documents')
    .delete()
    .eq('id', docId)

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'Document deleted' })
}
