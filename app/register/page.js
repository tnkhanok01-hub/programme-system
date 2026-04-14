"use client";

import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function Register() {
  const [name, setName] = useState("");
  const [matric, setMatric] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();
    setMessage("");

    if (!name || !matric || !email || !password) {
      setMessage("⚠️ Please fill all fields");
      return;
    }

    // 🔹 1. Create user in Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage("❌ " + error.message);
      return;
    }

    console.log("Auth Data:", data);

    // 🔹 2. Get user safely
    const user = data.user || data.session?.user;

    if (!user) {
      setMessage("❌ User not created properly");
      return;
    }

    // 🔹 3. Insert into profiles table
    const { data: insertData, error: profileError } = await supabase
  .from("profiles")
  .upsert({
    id: user.id,
    name,
    email,
    matric,
    role: "student",
  })
  .select();

    if (profileError) {
      console.log("Profile Error:", profileError);
      setMessage("❌ Failed to save profile");
    } else {
      setMessage("✅ Registered successfully!");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl w-80 border border-white/20">
        
        <h2 className="text-white text-2xl font-bold text-center mb-6">
          Create Account
        </h2>

        <form onSubmit={handleRegister} className="space-y-4">

          <input
            type="text"
            placeholder="Full Name"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Matric Number"
            className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400"
            value={matric}
            onChange={(e) => setMatric(e.target.value)}
          />

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
            className="w-full bg-blue-500 hover:bg-blue-600 transition p-3 rounded-lg text-white font-semibold"
          >
            Register
          </button>
        </form>

        {message && (
  <p
    className={`text-center text-sm mt-3 ${
      message.toLowerCase().includes("success")
        ? "text-green-300"
        : "text-red-400"
    }`}
  >
    {message}
  </p>
)}
        <p className="text-gray-300 text-sm text-center mt-4">
          Already have an account?
        </p>

        <a href="/login">
          <button className="w-full mt-2 bg-green-500 hover:bg-green-600 transition p-3 rounded-lg text-white font-semibold">
            Go to Login
          </button>
        </a>
      </div>
    </div>
  );
}