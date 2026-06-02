import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { sendEmail } from "@/lib/sendEmail";


function getToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.replace('Bearer ', '');
}

function makeServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const svc = makeServiceClient();

  const { data: { user }, error: authError } = await svc.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: userData } = await svc
    .from('users')
    .select('full_name, roles(name)')
    .eq('id', user.id)
    .single();

  const callerRole = (userData?.roles as any)?.name?.toLowerCase() ?? '';
  const callerName = userData?.full_name ?? 'Unknown';

  if (callerRole !== 'admin' && callerRole !== 'superadmin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: programmeId } = await params;

  const { data: programme, error: fetchError } = await svc
    .from('programmes')
    .select('id, name, status, advisor_id, programme_director_id')
    .eq('id', programmeId)
    .single();

  if (fetchError || !programme) {
    return NextResponse.json({ error: 'Programme not found.' }, { status: 404 });
  }

  // Get the latest uploaded updated_paperwork in the approval phase
  const { data: approvalDoc } = await svc
    .from('programme_documents')
    .select('id, file_path, file_name')
    .eq('programme_id', programmeId)
    .eq('phase', 'approval')
    .eq('doc_type', 'updated_paperwork')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!approvalDoc) {
    return NextResponse.json(
      { error: 'Upload the updated paperwork before approving.' },
      { status: 400 }
    );
  }

  // ── Admin stage ──────────────────────────────────────────────────────────
  if (callerRole === 'admin') {
    if (programme.advisor_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden: you are not the assigned advisor.' }, { status: 403 });
    }
    if (programme.status !== 'Pending') {
      return NextResponse.json(
        { error: `Cannot approve: programme status is "${programme.status}", expected "Pending".` },
        { status: 409 }
      );
    }

    // Replace pre-phase paperwork with admin's signed version
    const { data: existingPreDoc } = await svc
      .from('programme_documents')
      .select('id')
      .eq('programme_id', programmeId)
      .eq('phase', 'pre')
      .eq('doc_type', 'paperwork')
      .maybeSingle();

    if (existingPreDoc) {
      await svc
        .from('programme_documents')
        .update({ file_path: approvalDoc.file_path, file_name: approvalDoc.file_name })
        .eq('id', existingPreDoc.id);
    } else {
      await svc
        .from('programme_documents')
        .insert({ programme_id: programmeId, phase: 'pre', doc_type: 'paperwork', file_path: approvalDoc.file_path, file_name: approvalDoc.file_name });
    }

    const { data: updated, error: updateError } = await svc
      .from('programmes')
      .update({ status: 'Under Review', approved_by_admin_name: callerName })
      .eq('id', programmeId)
      .select()
      .single();

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    // Notify all superadmins
    const { data: superadminRoles } = await svc.from('roles').select('id').eq('name', 'superadmin');
    const superadminRoleIds = (superadminRoles ?? []).map((r: any) => r.id);
    if (superadminRoleIds.length > 0) {
      const { data: superadminUsers } = await svc.from('users').select('id').in('role_id', superadminRoleIds);
      const superadminIds = (superadminUsers ?? []).map((u: any) => u.id);
      if (superadminIds.length > 0) {
        await svc.from('notifications').insert(
          superadminIds.map((uid: string) => ({
            user_id: uid,
            title: 'Programme Under Review',
            message: `"${updated.name}" has been approved by admin and is waiting for your final review.`,
          }))
        );
      }
    }

    return NextResponse.json({ message: 'Programme sent for superadmin review.', programme: updated });
  }

  // ── Superadmin stage ─────────────────────────────────────────────────────
  if (programme.status !== 'Under Review') {
    return NextResponse.json(
      { error: `Cannot approve: programme status is "${programme.status}", expected "Under Review".` },
      { status: 409 }
    );
  }

  // Replace pre-phase paperwork with superadmin's signed version
  const { data: existingPreDoc } = await svc
    .from('programme_documents')
    .select('id')
    .eq('programme_id', programmeId)
    .eq('phase', 'pre')
    .eq('doc_type', 'paperwork')
    .maybeSingle();

  if (existingPreDoc) {
    await svc
      .from('programme_documents')
      .update({ file_path: approvalDoc.file_path, file_name: approvalDoc.file_name })
      .eq('id', existingPreDoc.id);
  } else {
    await svc
      .from('programme_documents')
      .insert({ programme_id: programmeId, phase: 'pre', doc_type: 'paperwork', file_path: approvalDoc.file_path, file_name: approvalDoc.file_name });
  }

  const { data: updated, error: updateError } = await svc
    .from('programmes')
    .update({
      status: 'Approved',
      approved_by_superadmin_name: callerName,
      approved_at: new Date().toISOString(),
    })
    .eq('id', programmeId)
    .select()
    .single();

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  const { data: director } = await svc
  .from("users")
  .select("email")
  .eq("id", programme.programme_director_id)
  .single();

  // Notify the programme director
  if (programme.programme_director_id) {
    await svc.from('notifications').insert({
      user_id: programme.programme_director_id,
      title: 'Programme Approved',
      message: `Your programme "${updated.name}" has been approved. Congratulations!`,
    });
    if (director?.email) {
      await sendEmail(
        director.email,
        "Programme Approved",
        `Dear Programme Director,\n\nWe are pleased to inform you that your programme "${updated.name}" has been approved.\n\nYou may now proceed with the next stages of programme management.\n\nRegards,\nUTM-SPMS`
      ).catch(() => {})
    }
  }

  return NextResponse.json({ message: 'Programme approved.', programme: updated });
}

