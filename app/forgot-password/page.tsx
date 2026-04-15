'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { Mail, Send, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();

  // Redirect if already logged in
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

      if (profile.role === 'superadmin') router.replace('/superadmin');
      else if (profile.role === 'admin') router.replace('/admin');
      else router.replace('/student');
    };

    checkSession();
  }, []);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsError(false);
    setIsLoading(true);

    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsError(true);
      setMessage(data.error);
      // Start cooldown if rate limited
      if (res.status === 429) setCooldown(60);
    } else {
      setIsError(false);
      setMessage(data.message);
      setCooldown(60); // prevent double-sending on success too
    }

    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl shadow-md p-7 flex flex-col gap-6">

        <div className="text-center">
          <h2 className="text-white text-2xl font-bold">Reset Password</h2>
          <p className="text-slate-400 text-sm mt-2">
            Enter your UTM email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleResetPassword} className="flex flex-col gap-4">
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Mail size={16} className="text-slate-400" />
              UTM Email Address
            </div>
            <input
              type="email"
              placeholder="e.g. ahmad@graduate.utm.my"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading || cooldown > 0}
            />
          </label>

          {/* Message */}
          {message && (
            <p className={`text-sm text-center px-2 py-2 rounded-md ${
              isError
                ? 'text-red-400 bg-red-400/10'
                : 'text-green-400 bg-green-400/10'
            }`}>
              {isError ? '❌' : '✅'} {message}
            </p>
          )}

          {/* Cooldown notice */}
          {cooldown > 0 && (
            <p className="text-yellow-400 bg-yellow-400/10 text-sm text-center px-2 py-2 rounded-md">
              ⏳ You can resend in {cooldown}s
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading || cooldown > 0}
            className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2"
          >
            {isLoading ? 'Sending...' : (
              <>
                <Send size={18} />
                {cooldown > 0 ? `Resend in ${cooldown}s` : 'Send Reset Link'}
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-2">
          <Link href="/login" className="text-slate-400 hover:text-white flex items-center justify-center gap-2 text-sm">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>

      </div>
    </main>
  );
}
