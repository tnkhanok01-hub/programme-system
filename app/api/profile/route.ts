import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization")

    if (!authHeader) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.replace("Bearer ", "")

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 })
    }

    // ✅ CLEAN QUERY (users + roles)
    const { data, error } = await supabase
      .from("users")
      .select(`
        full_name,
        phone,
        matric_number,
        staff_number,
        created_at,
        roles(name)
      `)
      .eq("id", user.id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const role = Array.isArray(data.roles)
    ? data.roles[0]?.name
    : data.roles?.name ?? "student";

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: data.full_name,
      phone: data.phone,
      matric: data.matric_number,
      staff: data.staff_number,
      role,
      created_at: data.created_at,
    })

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}