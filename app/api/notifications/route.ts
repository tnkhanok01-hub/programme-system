import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUser(request: Request) {
  const auth = request.headers.get('Authorization')
  if (!auth?.startsWith('Bearer ')) return null
  const token = auth.replace('Bearer ', '')
  const { data: { user } } = await makeServiceClient().auth.getUser(token)
  return user ?? null
}

// DELETE /api/notifications — clears notifications by ID list for the authenticated user
export async function DELETE(request: Request) {
  const user = await getUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let ids: string[] = []
  try {
    const body = await request.json()
    ids = Array.isArray(body.ids) ? body.ids : []
  } catch { /* no body */ }

  if (ids.length === 0) {
    return NextResponse.json({ error: 'No notification IDs provided.' }, { status: 400 })
  }

  const { error } = await makeServiceClient()
    .from('notifications')
    .delete()
    .in('id', ids)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ message: 'Notifications cleared.' })
}
