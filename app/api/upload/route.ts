import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// Service role client — used for storage upload + DB insert
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    // ── 1. Verify the user's auth token ─────────────────────────────────
    const authHeader = req.headers.get("Authorization") ?? ""
    const token = authHeader.replace("Bearer ", "").trim()

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabaseUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // ── 2. Check role ────────────────────────────────────────────────────
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const role = profile?.role?.toLowerCase() ?? ""
    const isAdmin = role === "admin" || role === "superadmin"

    // ── 3. Parse form data ───────────────────────────────────────────────
    const formData = await req.formData()
    const file = formData.get("file") as File
    const programme_id = formData.get("programme_id") as string
    const phase = (formData.get("phase") as string) ?? "pre"
    const doc_type = (formData.get("doc_type") as string) || null  // ← NEW

    if (!file || !programme_id) {
      return NextResponse.json(
        { error: "Missing file or programme_id" },
        { status: 400 }
      )
    }

    // ── 4. If student, verify they are the programme director ────────────
    if (!isAdmin) {
      const { data: programme } = await supabaseAdmin
        .from("programmes")
        .select("programme_director_id")
        .eq("id", programme_id)
        .single()

      if (!programme || programme.programme_director_id !== user.id) {
        return NextResponse.json(
          { error: "Forbidden: you are not the programme director" },
          { status: 403 }
        )
      }
    }

    // ── 5. Upload file to storage ────────────────────────────────────────
    const filePath = `${programme_id}/${phase}/${Date.now()}-${file.name}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(filePath, file)

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 })
    }

    // ── 6. Insert record into DB ─────────────────────────────────────────
    const { error: dbError } = await supabaseAdmin
      .from("programme_documents")
      .insert([{
        programme_id,
        file_name: file.name,
        file_path: filePath,
        phase,
        doc_type,  // ← NEW: null for during/post, 'paperwork'/'oshe'/'poster' for pre
      }])

    if (dbError) {
      await supabaseAdmin.storage.from("documents").remove([filePath])
      return NextResponse.json({ error: dbError.message }, { status: 400 })
    }

    return NextResponse.json({ message: "Upload success", filePath })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    )
  }
}