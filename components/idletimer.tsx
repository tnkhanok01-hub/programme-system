"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const IDLE_TIME = 30 * 60 * 1000; // 30 minutes

export default function IdleTimer() {
  const router = useRouter();

  useEffect(() => {
    let timeout: NodeJS.Timeout;

    const logout = async () => {
      await supabase.auth.signOut();
      router.push("/login");
    };

    const resetTimer = () => {
      clearTimeout(timeout);
      timeout = setTimeout(logout, IDLE_TIME);
    };

    // Track activity
    const events = ["mousemove", "keydown", "click", "scroll"];

    events.forEach((event) =>
      window.addEventListener(event, resetTimer)
    );

    // Start timer initially
    resetTimer();

    return () => {
      clearTimeout(timeout);
      events.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      );
    };
  }, [router]);

  return null;
}