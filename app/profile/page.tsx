"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  name: string;
  email: string | null;
  id: string;
  matric: string;
  staff:string;
  role: string;
  created_at: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    const getUser = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData.session?.user;

      if (!authUser) {
        setLoading(false);
        window.location.href = "/login";
        return;
      }

      // 1. Get role from profiles table
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authUser.id)
        .single();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        setLoading(false);
        return;
      }

      const role = profile?.role ?? "student";
      let fullName = "User Profile";
      let matricNum = null;
      let staffNum = null;
      let phoneNum = null;

      // 2. Query the right table based on role
      if (role === "student") {
        const { data: student, error } = await supabase
          .from("students")
          .select("full_name, matric_number, phone")
          .eq("id", authUser.id)
          .single();

        if (error) console.error("Student fetch error:", error);
        fullName = student?.full_name ?? "Student";
        matricNum = student?.matric_number ?? null;
        phoneNum = student?.phone ?? null;

      } else if (role === "admin" || role === "superadmin") {
        const { data: admin, error } = await supabase
          .from("admins")
          .select("full_name, staff_id, phone")
          .eq("id", authUser.id)
          .single();

        if (error) console.error("Admin fetch error:", error);
        fullName = admin?.full_name ?? "Admin";
        staffNum = admin?.staff_id ?? null;
        phoneNum = admin?.phone ?? null;
      }

      const createdAt = authUser.created_at;

      setUser({
        name: fullName,
        email: authUser.email ?? null,
        id: authUser.id,
        matric: matricNum ?? null,
        staff: staffNum ?? null,
        role,
        created_at: createdAt ?? null,
        phone: phoneNum ?? null,
      });

      setLoading(false);
    };

    getUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  // Role badge style
  const getRoleBadge = (role: string) => {
    if (role === "superadmin") return "bg-purple-500/20 text-purple-400"
    if (role === "admin") return "bg-blue-500/20 text-blue-400"
    return "bg-green-500/20 text-green-400"
  }

  const getRoleLabel = (role: string) => {
    if (role === "superadmin") return "Super Admin"
    if (role === "admin") return "Admin"
    return "Student"
  }

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col items-center justify-center p-5 font-sans">

      {/* Header */}
      <div className="text-center mb-5">
        <h1 className="text-white text-[18px] font-bold">
          UTM Smart Programme Management System
        </h1>
        <p className="text-slate-400 text-sm font-semibold">(UTM-SPMS)</p>
      </div>

      {/* Card */}
      <div className="bg-[#111c33] w-full max-w-[420px] rounded-2xl p-8 text-center shadow-lg border border-white/5">

        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold mx-auto">
          {user?.name?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            "U"}
        </div>

        {/* Name */}
        <h2 className="text-white mt-4 text-xl">{user?.name}</h2>

        {/* Role badge */}
        {user?.role && (
          <span className={`inline-block mt-2 mb-5 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadge(user.role)}`}>
            {getRoleLabel(user.role)}
          </span>
        )}

        <div className="flex flex-col gap-3 mb-5">

          {!isAdmin ? (
            <div className="bg-slate-900 p-4 rounded-lg text-left">
              <p className="text-slate-400 text-xs mb-1">Matric Number</p>
              <p className="text-white text-sm">{user?.matric ?? "N/A"}</p>
            </div>
          ):
          (
            <div className="bg-slate-900 p-4 rounded-lg text-left">
              <p className="text-slate-400 text-xs mb-1">Staff ID</p>
              <p className="text-white text-sm">{user?.staff ?? "N/A"}</p>
            </div>
          )}

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Email</p>
            <p className="text-white text-sm">{user?.email ?? "N/A"}</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Phone Number</p>
            <p className="text-white text-sm">{user?.phone ?? "N/A"}</p>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg text-left">
            <p className="text-slate-400 text-xs mb-1">Account Created</p>
            <p className="text-white text-sm">
              {user?.created_at
                ? new Date(user.created_at).toLocaleDateString()
                : "N/A"}
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
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
            className="w-full py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-colors"
          >
            Logout
          </button>
        )}

      </div>
    </div>
  );
}