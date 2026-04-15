"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "../lib/supabaseClient"

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push("/login")
        return
      }

      const { data } = await supabase
        .from("users")
        .select("role:roles(name)")
        .eq("id", session.user.id)
        .single()

      const role = data?.role[0].name

      if (role === "superadmin") {
        router.push("/superadmin")
      } else if (role === "admin") {
        router.push("/admin")
      } else {
        router.push("/student")
      }
    }

    checkSession()
  }, [])

  return null
}