import { useEffect } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter } from "next/navigation"

const TIMEOUT = 30 * 60 * 1000 // 30 minutes

export default function useSessionTimeout() {
  const router = useRouter()

  useEffect(() => {
    let timeout: NodeJS.Timeout

    const logout = async () => {
      await supabase.auth.signOut()
      router.replace("/login")
    }

    const resetTimer = () => {
      localStorage.setItem("lastActivity", Date.now().toString())

      clearTimeout(timeout)
      timeout = setTimeout(() => {
        logout()
      }, TIMEOUT)
    }

    const checkActivity = () => {
      const last = localStorage.getItem("lastActivity")
      if (!last) return

      const diff = Date.now() - parseInt(last)
      if (diff > TIMEOUT) {
        logout()
      }
    }

    // Initial check
    checkActivity()
    resetTimer()

    // Track activity
    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("keydown", resetTimer)
    window.addEventListener("click", resetTimer)

    return () => {
      clearTimeout(timeout)
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("keydown", resetTimer)
      window.removeEventListener("click", resetTimer)
    }
  }, [])
}