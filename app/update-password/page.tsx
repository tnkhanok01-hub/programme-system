"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function UpdatePassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setIsError(false);

    if (!password || !confirmPassword) {
      setIsError(true);
      setMessage("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setIsError(true);
      setMessage("Passwords do not match.");
      return;
    }

    if (password.length < 8) {
      setIsError(true);
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setIsError(true);
      setMessage(error.message);
      setIsLoading(false);
      return;
    }

    setIsError(false);
    setMessage("✅ Password updated successfully!");

    setTimeout(() => {
      router.push("/login");
    }, 2000);

    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl shadow-md p-7 flex flex-col gap-6">

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">Update Password</h2>
          <p className="text-slate-400 text-sm mt-2">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">

          <input
            type="password"
            placeholder="New Password"
            className="p-3 rounded-md bg-slate-700 text-white outline-none"
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />

          <input
            type="password"
            placeholder="Confirm Password"
            className="p-3 rounded-md bg-slate-700 text-white outline-none"
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />

          {message && (
            <p className={`text-sm text-center px-2 py-2 rounded-md ${
              isError
                ? "text-red-400 bg-red-400/10"
                : "text-green-400 bg-green-400/10"
            }`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-md bg-blue-500 hover:bg-blue-600 text-white font-bold"
          >
            {isLoading ? "Updating..." : "Update Password"}
          </button>
        </form>

      </div>
    </main>
  );
}