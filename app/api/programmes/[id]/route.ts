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

  const userClient = makeUserClient(token);
  const { id: programmeId } = await params; // ← await params (Next.js 15)

  // 1. Verify identity
  const { data: { user }, error: authError } = await userClient.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 2. Check global role (superadmin / admin)
  const { data: profile } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.role === "superadmin";
  const isAdmin = profile?.role === "admin";

  // 3. If not superadmin/admin, check programme-level role
  let isProgrammeDirector = false;
  if (!isSuperAdmin && !isAdmin) {
    const { data: programmeRole } = await userClient
      .from("programme_roles")
      .select("role")
      .eq("programme_id", programmeId)
      .eq("user_id", user.id)
      .eq("role", "Programme Director")
      .single();

    isProgrammeDirector = !!programmeRole;
  }

  // 4. Deny if no matching role
  if (!isSuperAdmin && !isAdmin && !isProgrammeDirector) {
    return NextResponse.json(
      { error: "Only a Super Admin, Admin, or Programme Director can delete this programme." },
      { status: 403 }
    );
  }

  // 5. Delete via service client (bypasses RLS for admin/superadmin)
  const { error: deleteError } = await makeServiceClient()
    .from("programmes")
    .delete()
    .eq("id", programmeId);

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 });
  return NextResponse.json({ message: "Programme deleted successfully" });
}