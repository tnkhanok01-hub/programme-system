'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    setMessage('');
    setIsLoading(true);

    if (!email || !password) {
      setMessage('⚠️ Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setMessage('❌ ' + authError.message);
      setIsLoading(false);
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-5">
        
        {/* Title */}
        <h2 className="text-white text-2xl font-bold text-center">Login</h2>

        {/* Email */}
        <input
          type="email"
          placeholder="UTM Email"
          className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        {/* Login Button */}
        <button
          onClick={handleLogin}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Message */}
        {message && (
          <p className="text-slate-200 text-sm text-center">{message}</p>
        )}

        {/* Register link */}
        <p className="text-center text-sm text-slate-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-400 underline hover:text-blue-300">
            Register here
          </Link>
        </p>

        {/* Forgot password */}
        <p className="text-center text-sm">
          <Link href="/forgot-password" className="text-blue-400 underline hover:text-blue-300">
            Forgot Password?
          </Link>
        </p>

      </div>
    </div>
  );
}