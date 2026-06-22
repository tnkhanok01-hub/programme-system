import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.replace("Bearer ", "");
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

// ─── GET /api/programmes/[id] ─────────────────────────────────────────────────
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Use service client to verify token — avoids RLS issues with anon key
  const { data: { user }, error: authError } = await makeServiceClient().auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id: programmeId } = await params;

  const { data: programme, error } = await makeServiceClient()
    .from('programmes')
    .select('*')
    .eq('id', programmeId)
    .single();

  if (error || !programme) {
    return NextResponse.json({ error: 'Programme not found.' }, { status: 404 });
  }

  const isDirector = programme.programme_director_id === user.id;

  // Any authenticated user can view. isDirector tells the client
  // whether to show the resubmit form.
  return NextResponse.json({ programme, isDirector });
}

// ─── PUT /api/programmes/[id] ─────────────────────────────────────────────────
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = makeUserClient(token);
  const { data: { user }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: programmeId } = await params; // ← await params
  const body = await request.json();
  const { name, category, venue, budget, start_date, end_date } = body;

  const { data, error } = await supabase
    .from("programmes")
    .update({ name, category, venue, budget, start_date, end_date })
    .eq("id", programmeId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ message: "Programme updated successfully", programme: data });
}

// ─── DELETE /api/programmes/[id] ─────────────────────────────────────────────
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = getToken(request);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const svc = makeServiceClient();
  const { id: programmeId } = await params;

  // 1. Verify identity
  const { data: { user }, error: authError } = await svc.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Check caller's global role
  const { data: userData } = await svc
    .from("users")
    .select("roles(name)")
    .eq("id", user.id)
    .single();
  const callerRole = (userData?.roles as any)?.name?.toLowerCase() ?? "";
  const isPrivileged = callerRole === "superadmin" || callerRole === "admin";

  // 3. Check programme-level role — Programme Director, admin, or superadmin may delete
  if (!isPrivileged) {
    const { data: programmeRole } = await svc
      .from("programme_roles")
      .select("role")
      .eq("programme_id", programmeId)
      .eq("user_id", user.id)
      .eq("role", "Programme Director")
      .single();

    if (!programmeRole) {
      return NextResponse.json(
        { error: "Only the Programme Director, admin, or superadmin can delete this programme." },
        { status: 403 }
      );
    }
  }

  // 4. Fetch document file paths so we can clean up storage
  const { data: docs } = await svc
    .from("programme_documents")
    .select("file_path")
    .eq("programme_id", programmeId);

  // 5. Remove storage files
  if (docs && docs.length > 0) {
    const paths = docs.map((d: { file_path: string }) => d.file_path);
    await svc.storage.from("documents").remove(paths);
  }

  // 6. Cascade-delete all child rows that reference this programme
  await svc.from("notification_sent_log").delete().eq("programme_id", programmeId);
  await svc.from("finance_transactions").delete().eq("programme_id", programmeId);
  await svc.from("finance_budget_items").delete().eq("programme_id", programmeId);
  await svc.from("student_activity_records").delete().eq("programme_id", programmeId);
  await svc.from("merit_transactions").delete().eq("programme_id", programmeId);
  await svc.from("merit").delete().eq("programme_id", programmeId);
  await svc.from("attendance").delete().eq("programme_id", programmeId);
  await svc.from("programme_merit_metadata").delete().eq("programme_id", programmeId);
  await svc.from("programme_documents").delete().eq("programme_id", programmeId);
  await svc.from("programme_roles").delete().eq("programme_id", programmeId);

  // 7. Delete the programme itself
  const { error: deleteError } = await svc
    .from("programmes")
    .delete()
    .eq("id", programmeId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ message: "Programme deleted successfully" });
}