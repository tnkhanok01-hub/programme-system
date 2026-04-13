'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  // State management for form inputs and feedback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Prevents page reload on form submission
    setMessage('');
    setIsLoading(true);

    // Basic validation
    if (!email || !password) {
      setMessage('⚠️ Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    // Attempt to sign in via Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setMessage('❌ ' + authError.message);
      setIsLoading(false);
      return;
    }

    // Fetch the user's role from the 'profiles' table after successful authentication
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single();

    if (profileError || !profileData) {
      setMessage('❌ Failed to fetch user profile. Please contact support.');
      setIsLoading(false);
      return;
    }

    setMessage('✅ Login successful! Redirecting...');

    // Redirect user to the specific dashboard based on their role
    const userRole = profileData.role;
    if (userRole === 'superadmin') {
      router.push('/superadmin');
    } else if (userRole === 'admin') {
      router.push('/admin');
    } else {
      router.push('/student');
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl shadow-md p-7 flex flex-col gap-6">
        
        {/* Header section with updated SPMS text */}
        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">Login</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome back to SPMS</p>
        </div>

        {/* Login form using standard HTML elements */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          {/* Email input field with icon decoration */}
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-slate-400" />
              UTM Email
            </div>
            <input
              type="email"
              placeholder="e.g. ahmad@graduate.utm.my"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>

          {/* Password input field */}
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-slate-400" />
              Password
            </div>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
            />
          </label>

          {/* Dynamic feedback message area */}
          {message && (
            <p className={`text-sm text-center px-2 py-2 rounded-md ${
              message.startsWith('✅') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              {message}
            </p>
          )}

          {/* Submit button with loading state support */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition flex items-center justify-center gap-2"
          >
            {isLoading ? 'Logging in...' : (
              <>
                <LogIn size={18} />
                Login
              </>
            )}
          </button>
        </form>

        {/* Footer links for registration and password recovery */}
        <div className="flex flex-col gap-2 text-center text-sm">
          <p className="text-slate-400">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 transition">
              Register here
            </Link>
          </p>
          <Link href="/forgot-password" className="text-blue-400 hover:text-blue-300 transition">
            Forgot Password?
          </Link>
        </div>

      </div>
    </main>
  );
}