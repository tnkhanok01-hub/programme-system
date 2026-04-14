"use client"

import useSessionTimeout from "@/app/provider/hooks/useSessionTimeout"

export default function SessionProvider({
  children,
}: {
  children: React.ReactNode
}) {
  useSessionTimeout()

  return <>{children}</>
}