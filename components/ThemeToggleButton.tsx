"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/provider/ThemeContext";
import { supabase } from "@/lib/supabaseClient";

export default function ThemeToggleButton() {
  const { mode, t, setMode } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={async () => {
        const nextMode = isDark ? "light" : "dark";
        setMode(nextMode);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (session) {
          fetch("/api/settings", {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ theme: nextMode }),
          });
        }
      }}
      style={{
        background: t.bgInput,
        border: `1px solid ${t.border}`,
        borderRadius: "10px",
        width: "40px",
        height: "40px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: t.textMuted,
      }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
