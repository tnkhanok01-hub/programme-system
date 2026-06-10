import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { DIRECTOR_MERIT } from "@/lib/constants"

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
  ? (data.roles[0] as any)?.name
  : (data.roles as any)?.name ?? "student";

    // Backfill: ensure all approved programmes where user is director have a merit record
    const { data: directorProgrammes } = await supabase
      .from('programmes')
      .select('id')
      .eq('programme_director_id', user.id)
      .eq('status', 'Approved')

    if (directorProgrammes && directorProgrammes.length > 0) {
      await supabase.from('merit').upsert(
        directorProgrammes.map(p => ({
          user_id:      user.id,
          programme_id: p.id,
          points:       DIRECTOR_MERIT,
          status:       'awarded',
          updated_at:   new Date().toISOString(),
        })),
        { onConflict: 'user_id,programme_id', ignoreDuplicates: true }
      )
    }

    const { data: meritData } = await supabase
      .from('merit')
      .select('points, status, reason, updated_at, programmes(name)')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: data.full_name,
      phone: data.phone,
      matric: data.matric_number,
      staff: data.staff_number,
      role,
      created_at: data.created_at,
      merit: meritData ?? [],
    })

  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}