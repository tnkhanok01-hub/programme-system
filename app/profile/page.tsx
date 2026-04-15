"use client";

import { useEffect, useState } from "react";
// Replace old supabase client with the new SSR-compatible browser client
import { createClient } from "@/utils/supabase/client";

type UserProfile = {
  name: string;
  email: string | null;
  id: string;
};

export default function ProfilePage() {
  // Initialize the Supabase client for the browser environment
  const supabase = createClient();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      // Get user from the new SSR-compatible client (reads from Cookies)
      const { data } = await supabase.auth.getUser();
      const authUser = data.user;

      if (!authUser) {
        setLoading(false);
        return;
      }

      // Fetch from students table
      const { data: student, error } = await supabase
        .from("students")
        .select("full_name")
        .eq("id", authUser.id)
        .single();

      if (error) {
        console.error("Student fetch error:", error);
      }

      setUser({
        name: student?.full_name ?? "User Profile",
        email: authUser.email ?? null,
        id: authUser.id,
      });

      setLoading(false);
    };

    getUser();
  }, [supabase]); // Added supabase dependency

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col items-center justify-center p-5 font-sans">
      
      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="text-white text-[18px] font-bold">
          UTM Smart Programme Management System
        </h1>
        <p className="text-slate-400 text-sm font-semibold">
          (UTM-SPMS)
        </p>
      </div>

      {/* Card */}
      <div className="bg-[#111c33] w-full max-w-[420px] rounded-2xl p-8 text-center shadow-lg border border-white/5">

        {/* Avatar (better fallback) */}
        <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold mx-auto">
          {user?.name?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            "U"}
        </div>

        {/* Name from DB */}
        <h2 className="text-white mt-4 mb-5 text-xl">
          {user?.name}
        </h2>

        <div className="flex flex-col gap-3 mb-5">

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Status</p>
            <p className="text-white text-sm">
              {user ? "Logged In" : "No user logged in"}
            </p>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Email</p>
            <p className="text-white text-sm">
              {user?.email ?? "N/A"}
            </p>
          </div>
        </div>

        {!user ? (
          <button
            onClick={() => (window.location.href = "/login")}
            className="w-full py-3 rounded-lg bg-blue-500 text-white font-semibold"
          >
            Login
          </button>
        ) : (
          <button
            onClick={async () => {
              // Sign out using the SSR-compatible client (clears Cookies automatically)
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="w-full py-3 rounded-lg bg-red-500 text-white font-semibold"
          >
            Logout
          </button>
        )}

      </div>
    </div>
  );
}