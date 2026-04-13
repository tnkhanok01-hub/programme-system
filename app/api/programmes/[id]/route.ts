import { supabase } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const programmeId = params.id;

  // 1. Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check if user is Programme Director
  const { data: role, error: roleError } = await supabase
    .from("programme_roles")
    .select("role")
    .eq("programme_id", programmeId)
    .eq("user_id", user.id)
    .eq("role", "PROGRAMME_DIRECTOR")
    .single();

  if (roleError || !role) {
    return NextResponse.json(
      { error: "Only Programme Director can delete this programme" },
      { status: 403 }
    );
  }

  // 3. Delete programme
  const { error: deleteError } = await supabase
    .from("programmes")
    .delete()
    .eq("id", programmeId);

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ message: "Programme deleted successfully" });
}