'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// Replace old supabase client with the new SSR-compatible browser client
import { createClient } from '../../utils/supabase/client';
import { Mail, Send, ArrowLeft } from 'lucide-react';

export default function ForgotPassword() {
  // Initialize the Supabase client for the browser environment
  const supabase = createClient();
  
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    // Validation: Check if input is empty
    if (!email) {
      setMessage('⚠️ Please enter your email address.');
      setIsLoading(false);
      return;
    }

    // Validation: Enforce UTM specific email domains
    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      setMessage('❌ Only UTM email addresses are allowed.');
      setIsLoading(false);
      return;
    }

    // Supabase Auth call: Sends a magic link to the user's email
    // Redirects user to '/update-password' page upon clicking the link
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      setMessage('✅ Password reset link sent! Check your email.');
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
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500 transition"
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
            />
          </label>

          {message && (
            <p className={`text-sm text-center px-2 py-2 rounded-md ${
              message.startsWith('✅') ? 'text-green-400 bg-green-400/10' : 'text-red-400 bg-red-400/10'
            }`}>
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 mt-2 rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition flex items-center justify-center gap-2"
          >
            {isLoading ? 'Sending Link...' : (
              <>
                <Send size={18} />
                Send Reset Link
              </>
            )}
          </button>
        </form>

        <div className="text-center mt-2">
          <Link href="/login" className="text-slate-400 hover:text-white transition flex items-center justify-center gap-2 text-sm">
            <ArrowLeft size={16} />
            Back to Login
          </Link>
        </div>

      </div>
    </main>
  );
}