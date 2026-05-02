import { useEffect, useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabaseClient"
import { useRouter, usePathname } from "next/navigation"

const TIMEOUT = 1 * 60 * 1000   // 1 minute of inactivity before logout
const WARNING_DURATION = 5 * 1000 // show warning 5 s before logout

const PUBLIC_PATHS = ["/login", "/register", "/forgot-password", "/update-password"]

export default function useSessionTimeout() {
  const router = useRouter()
  const pathname = usePathname()
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(5)

  const routerRef = useRef(router)
  routerRef.current = router

  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef    = useRef<ReturnType<typeof setInterval> | null>(null)

  const clearAll = useCallback(() => {
    if (warningTimerRef.current) { clearTimeout(warningTimerRef.current);   warningTimerRef.current = null }
    if (logoutTimerRef.current)  { clearTimeout(logoutTimerRef.current);    logoutTimerRef.current  = null }
    if (countdownRef.current)    { clearInterval(countdownRef.current);     countdownRef.current    = null }
  }, [])

  const doLogout = useCallback(async () => {
    clearAll()
    setShowWarning(false)
    localStorage.removeItem("lastActivity")
    await supabase.auth.signOut()
    routerRef.current.replace("/login")
  }, [clearAll])

  const showWarningModal = useCallback(() => {
    setShowWarning(true)
    setCountdown(5)

    let remaining = 5
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(countdownRef.current!)
        countdownRef.current = null
      }
    }, 1000)

    logoutTimerRef.current = setTimeout(doLogout, WARNING_DURATION)
  }, [doLogout])

  const resetTimer = useCallback(() => {
    clearAll()
    setShowWarning(false)
    setCountdown(5)
    localStorage.setItem("lastActivity", Date.now().toString())
    warningTimerRef.current = setTimeout(showWarningModal, TIMEOUT - WARNING_DURATION)
  }, [clearAll, showWarningModal])

  // Exposed so the modal button can reset the session
  const stayLoggedIn = useCallback(() => resetTimer(), [resetTimer])

  useEffect(() => {
    if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return

    const checkActivity = () => {
      const last = localStorage.getItem("lastActivity")
      if (last && Date.now() - parseInt(last) > TIMEOUT) doLogout()
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("lastActivity")
        routerRef.current.replace("/login")
      }
    })

    checkActivity()
    resetTimer()

    window.addEventListener("mousemove", resetTimer)
    window.addEventListener("keydown", resetTimer)
    window.addEventListener("click", resetTimer)
    window.addEventListener("touchstart", resetTimer)

    return () => {
      clearAll()
      subscription.unsubscribe()
      window.removeEventListener("mousemove", resetTimer)
      window.removeEventListener("keydown", resetTimer)
      window.removeEventListener("click", resetTimer)
      window.removeEventListener("touchstart", resetTimer)
    }
  }, [pathname])

  return { showWarning, countdown, stayLoggedIn }
}
