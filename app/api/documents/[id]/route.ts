import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 🔥 1. get file path first
  const { data: doc } = await supabase
    .from('programme_documents')
    .select('file_path')
    .eq('id', id)
    .single()

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  // 🔥 2. delete from storage
  await supabase.storage
    .from('documents')
    .remove([doc.file_path])

  // 🔥 3. delete from DB
  const { error } = await supabase
    .from('programme_documents')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}