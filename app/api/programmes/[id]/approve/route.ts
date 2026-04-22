import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '');
}

function makeUserClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// POST /api/programmes/[id]/approve
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userClient = makeUserClient(token);
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Check role via users -> roles join
  const { data: userData } = await makeServiceClient()
    .from('users')
    .select('roles(name)')
    .eq('id', user.id)
    .single();

  const callerRole = (userData?.roles as any)?.name?.toLowerCase();
  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden. Only admins can approve programmes.' }, { status: 403 });
  }

  const { id: programmeId } = await params;

  const { data: programme, error: fetchError } = await makeServiceClient()
    .from('programmes')
    .select('id, status')
    .eq('id', programmeId)
    .single();

  if (fetchError || !programme) return NextResponse.json({ error: 'Programme not found.' }, { status: 404 });
  if (programme.status === 'Approved') return NextResponse.json({ error: 'Programme is already approved.' }, { status: 409 });

  const { data: updated, error: updateError } = await makeServiceClient()
    .from('programmes')
    .update({ status: 'Approved' })
    .eq('id', programmeId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ message: 'Programme approved successfully.', programme: updated });
}