"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Bell } from "lucide-react";


export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  useEffect(() => {
  fetchNotifications();
}, []);

const fetchNotifications = async () => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false });

  if (!error && data) {
    console.log(data);
    setNotifications(data);
  }
};
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          position: "relative",
          background: "#111827",
          border: "1px solid #374151",
          borderRadius: "10px",
          width: "40px",
          height: "40px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
        }}
      >
        <Bell size={16} color="white" />

        <span
          style={{
            position: "absolute",
            top: "8px",
            right: "8px",
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#ef4444",
          }}
        />
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "50px",
            width: "300px",
            background: "#111827",
            border: "1px solid #374151",
            borderRadius: "12px",
            padding: "12px",
            zIndex: 9999,
            boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
          }}
        >
          <h3
            style={{
              color: "white",
              marginBottom: "12px",
              fontSize: "14px",
            }}
          >
            Notifications
          </h3>

          {notifications.map((n) => (
  <div
    key={n.id}
    style={{
      background: "#1f2937",
      padding: "10px",
      borderRadius: "8px",
      marginBottom: "8px",
    }}
  >
    <p
      style={{
        color: "white",
        fontSize: "13px",
        fontWeight: "600",
        marginBottom: "4px",
      }}
    >
      {n.title}
    </p>

    <p
      style={{
        color: "#9ca3af",
        fontSize: "12px",
      }}
    >
      {n.message}
    </p>
  </div>
))}
        </div>
      )}
    </div>
  );
}