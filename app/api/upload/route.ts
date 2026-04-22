import { createClient } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

// ✅ SERVER-SIDE SUPABASE CLIENT (IMPORTANT FIX)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // MUST BE IN .env.local
)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()

    const file = formData.get("file") as File
    const programme_id = formData.get("programme_id") as string

    if (!file || !programme_id) {
      return NextResponse.json(
        { error: "Missing file or programme_id" },
        { status: 400 }
      )
    }

    const filePath = `${Date.now()}-${file.name}`

    // 1. Upload file to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, file)

    if (uploadError) {
      console.log("STORAGE ERROR:", uploadError)

      return NextResponse.json(
        { error: uploadError.message },
        { status: 400 }
      )
    }

    // 2. Insert record into database
    const { error: dbError } = await supabase
      .from("programme_documents")
      .insert([
        {
          programme_id,
          file_name: file.name,
          file_path: filePath,
        },
      ])

    if (dbError) {
      console.log("DB ERROR:", dbError)

      return NextResponse.json(
        { error: dbError.message },
        { status: 400 }
      )
    }

    return NextResponse.json({
      message: "Upload success",
      filePath,
    })
  } catch (err: any) {
    console.log("SERVER ERROR:", err)

    return NextResponse.json(
      { error: err.message || "Server error" },
      { status: 500 }
    )
  }
}