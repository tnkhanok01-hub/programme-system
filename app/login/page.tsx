"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Mail, Lock, LogIn } from "lucide-react";

import { useSearchParams } from 'next/navigation';

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const searchParams = typeof window !== "undefined" ? useSearchParams() : null;

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) return;

      const { data: userData } = await supabase
        .from("users")
        .select("roles(name)")
        .eq("id", user.id)
        .single();

      const role = (userData?.roles as any)?.name;

      if (!role) return;

      if (isMounted) {
        redirectByRole(role);
      }
    };

    if (searchParams?.get('confirmed') === 'true') {
      setMessage('✅ Email confirmed! You can now log in.');
    }
    if (searchParams?.get('error') === 'confirmation_failed') {
      setMessage('❌ Confirmation link is invalid or has expired.');
    }

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  // ✅ Role redirect helper
  const redirectByRole = (role: string) => {
    const path = window.location.pathname;

    if (role === "superadmin" && path !== "/superadmin") {
      router.replace("/superadmin");
    } else if (role === "admin" && path !== "/admin") {
      router.replace("/admin");
    } else if (role !== "admin" && role !== "superadmin" && path !== "/student") {
      router.replace("/student");
    }
  };

  // ✅ FIXED LOGIN HANDLER (uses Supabase client)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("❌ " + error.message);
      setIsLoading(false);
      return;
    }

    const user = data.user;

    // 🔄 Fetch role AFTER login
    const { data: userData } = await supabase
      .from("users")
      .select("roles(name)")
      .eq("id", user.id)
      .single();

    const role = (userData?.roles as any)?.name;

    if (!role) {
      setMessage("❌ Account not found");
      setIsLoading(false);
      return;
    }

    setMessage("✅ Login successful! Redirecting...");
    redirectByRole(role);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl shadow-md p-7 flex flex-col gap-6">

        {/* Header */}
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">Login</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome back to SPMS</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">

          {/* Email */}
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-slate-400" />
              UTM Email
            </div>
            <input
              type="email"
              placeholder="e.g. ahmad@graduate.utm.my"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>

          {/* Password */}
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-slate-400" />
              Password
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </label>

          {/* Message */}
          {message && (
            <p className={`text-sm text-center px-2 py-2 rounded-md ${
              message.startsWith('✅')
                ? 'text-green-400 bg-green-400/10'
                : 'text-red-400 bg-red-400/10'
            }`}>
              {message}
            </p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white font-bold flex items-center justify-center gap-2"
          >
            {isLoading ? 'Logging in...' : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="flex flex-col gap-2 text-center text-sm">
          <p className="text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300">
              Register here
            </Link>
          </p>
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300">
            Forgot Password?
          </Link>
        </div>

      </div>
    </main>
  );
}