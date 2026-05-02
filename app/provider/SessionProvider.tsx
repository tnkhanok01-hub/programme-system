"use client"

import useSessionTimeout from "@/app/provider/hooks/useSessionTimeout"
import SessionWarningModal from "@/app/provider/SessionWarningModal"

export default function SessionProvider({ children }: { children: React.ReactNode }) {
  const { showWarning, countdown } = useSessionTimeout()

  return (
    <>
      {children}
      {showWarning && (
        <SessionWarningModal countdown={countdown} />
      )}
    </>
  )
}
