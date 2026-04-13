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

      // Get role from profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single()

      const role = profile?.role

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

  return null  // nothing to render, just redirecting
}