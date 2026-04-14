"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setMessage("");
    setIsLoading(true);

    if (!email || !password) {
      setMessage("⚠️ Please fill all fields");
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage("❌ " + error.message);
      setIsLoading(false);
      return;
    }

    // role redirect (optional if you want same logic)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    const role = profile?.role;

    if (role === "superadmin") router.push("/superadmin");
    else if (role === "admin") router.push("/admin");
    else router.push("/student");
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl w-80 border border-white/20">
        
        <h2 className="text-white text-2xl font-bold text-center mb-6">
          Login
        </h2>

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="UTM Email"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-500 hover:bg-blue-600 transition p-3 rounded-lg text-white font-semibold"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {message && (
          <p className="text-gray-300 text-sm text-center mt-3">{message}</p>
        )}

        <p className="text-gray-300 text-sm text-center mt-4">
          Don’t have an account?{" "}
          <Link href="/register" className="text-blue-400 underline">
            Register here
          </Link>
        </p>

        <p className="text-center mt-2">
          <Link href="/forgot-password" className="text-blue-400 underline text-sm">
            Forgot Password?
          </Link>
        </p>
      </div>
    </div>
  );
}