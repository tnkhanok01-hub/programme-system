'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  // ✅ 1. SESSION CHECK (auto redirect if already logged in)
  //This function verifies user credentials and logs them in
  useEffect(() => {
    const checkSession = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      redirectByRole(profile.role);
    };

    checkSession();
  }, []);

  // ✅ Helper function (cleaner routing logic)
  const redirectByRole = (role: string) => {
    if (role === 'superadmin') {
      router.replace('/superadmin');
    } else if (role === 'admin') {
      router.replace('/admin');
    } else {
      router.replace('/student');
    }
  };

  // ✅ 2. LOGIN HANDLER (session-based)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!email || !password) {
      setMessage('⚠️ Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
//This displays error messages if login fails.
    if (error) {
      setMessage('❌ ' + error.message);
      setIsLoading(false);
      return;
    }

    // ✅ Get session AFTER login
    //We also maintain session so the user stays logged in.
    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setMessage('❌ Failed to get session.');
      setIsLoading(false);
      return;
    }

    // ✅ Fetch role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      setMessage('❌ Failed to fetch user role.');
      setIsLoading(false);
      return;
    }

    setMessage('✅ Login successful! Redirecting...');
    redirectByRole(profile.role);
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
