"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type UserProfile = {
  name: string;
  email: string | null;
  id: string;
  matric: string | null;
  staff: string | null;
  role: string;
  created_at: string | null;
  phone: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;

      if (!session) {
        router.replace("/login");
        return;
      }

      const res = await fetch("/api/profile", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.error);
        setLoading(false);
        return;
      }

      if (isMounted) {
        setUser({
          name: data.name,
          email: data.email ?? null,
          id: data.id,
          matric: data.matric ?? null,
          staff: data.staff ?? null,
          role: data.role,
          created_at: data.created_at ?? null,
          phone: data.phone ?? null,
        });
        setLoading(false);
      }
    };

    getUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        Loading...
      </div>
    );
  }

  const getRoleBadge = (role: string) => {
    if (role === "superadmin") return "bg-purple-500/20 text-purple-400";
    if (role === "admin") return "bg-blue-500/20 text-blue-400";
    return "bg-green-500/20 text-green-400";
  };

  const getRoleLabel = (role: string) => {
    if (role === "superadmin") return "Super Admin";
    if (role === "admin") return "Admin";
    return "Student";
  };

  return (
    <div className="min-h-screen bg-[#0b1220] flex flex-col items-center justify-center p-5 font-sans">

      <div className="text-center mb-5">
        <h1 className="text-white text-[18px] font-bold">
          UTM Smart Programme Management System
        </h1>
        <p className="text-slate-400 text-sm font-semibold">(UTM-SPMS)</p>
      </div>

      <div className="bg-[#111c33] w-full max-w-[420px] rounded-2xl p-8 text-center shadow-lg border border-white/5">

        <div className="w-20 h-20 rounded-full bg-slate-800 text-white flex items-center justify-center text-2xl font-bold mx-auto">
          {user?.name?.charAt(0)?.toUpperCase() ||
            user?.email?.charAt(0)?.toUpperCase() ||
            "U"}
        </div>

        <h2 className="text-white mt-4 text-xl">{user?.name}</h2>

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
          ) : (
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
            onClick={() => router.replace("/login")}
            className="w-full py-3 rounded-lg bg-blue-500 text-white font-semibold"
          >
            Login
          </button>
        ) : (
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
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