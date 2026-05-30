"use client";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell, X } from "lucide-react";
import { useTheme } from "@/app/provider/ThemeContext";

type Notification = {
  id: string;
  created_at: string;
  title: string;
  message: string;
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationBell() {
  const { t, mode } = useTheme();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !seenIds.has(n.id)).length;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
  }, []);

  const fetchNotifications = async (uid: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);

    if (!error && data) setNotifications(data as Notification[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    fetchNotifications(userId);

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => fetchNotifications(userId)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    const opening = !open;
    setOpen(opening);
    if (opening && notifications.length > 0) {
      setSeenIds(new Set(notifications.map((n) => n.id)));
    }
  };

  const handleClearAll = async () => {
    if (notifications.length === 0) return;

    const ids = notifications.map((n) => n.id);

    // Clear UI immediately
    setNotifications([]);
    setSeenIds(new Set());

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    fetch("/api/notifications", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ids }),
    });
  };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        onClick={handleOpen}
        style={{
          position: "relative",
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
        <Bell size={16} />
        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: "6px",
              right: "6px",
              minWidth: "16px",
              height: "16px",
              borderRadius: "8px",
              background: "#ef4444",
              color: "white",
              fontSize: "9px",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 3px",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50px",
            width: "320px",
            background: t.bgCard,
            border: `1px solid ${t.border}`,
            borderRadius: "14px",
            zIndex: 9999,
            boxShadow:
              mode === "dark"
                ? "0 12px 40px rgba(0,0,0,0.5)"
                : "0 12px 40px rgba(0,0,0,0.12)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 16px",
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            <span style={{ color: t.text, fontSize: "14px", fontWeight: 600 }}>
              Notifications
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: t.textFaint,
                    fontSize: "11px",
                    padding: 0,
                  }}
                >
                  Clear all
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: t.textFaint,
                  display: "flex",
                  padding: 0,
                }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          <div style={{ maxHeight: "380px", overflowY: "auto" }}>
            {loading ? (
              <p
                style={{
                  color: t.textFaint,
                  fontSize: "13px",
                  textAlign: "center",
                  padding: "28px 16px",
                  margin: 0,
                }}
              >
                Loading...
              </p>
            ) : notifications.length === 0 ? (
              <div style={{ padding: "36px 16px", textAlign: "center" }}>
                <Bell size={28} color={t.textFaintest} />
                <p
                  style={{
                    color: t.textFaint,
                    fontSize: "13px",
                    margin: "10px 0 0",
                  }}
                >
                  No notifications yet
                </p>
              </div>
            ) : (
              notifications.map((n) => {
                const isNew = !seenIds.has(n.id);
                return (
                  <div
                    key={n.id}
                    style={{
                      padding: "12px 16px",
                      borderBottom: `1px solid ${t.border}`,
                      background: isNew ? t.accentBg : "transparent",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "8px",
                        marginBottom: "3px",
                      }}
                    >
                      <p
                        style={{
                          color: t.text,
                          fontSize: "13px",
                          fontWeight: isNew ? 600 : 400,
                          margin: 0,
                        }}
                      >
                        {n.title}
                      </p>
                      <span
                        style={{
                          color: t.textFaintest,
                          fontSize: "11px",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {timeAgo(n.created_at)}
                      </span>
                    </div>
                    <p
                      style={{
                        color: t.textMuted,
                        fontSize: "12px",
                        margin: 0,
                        lineHeight: "1.5",
                      }}
                    >
                      {n.message}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}