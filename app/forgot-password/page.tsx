'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setMessage('');
    setIsLoading(true);

    if (!email) {
      setMessage('⚠️ Please enter your email address.');
      setIsLoading(false);
      return;
    }

    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      setMessage('❌ Only UTM email addresses are allowed.');
      setIsLoading(false);
      return;
    }

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
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4 py-8">
      <div className="w-full max-w-md lg:max-w-lg bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 lg:p-10 flex flex-col gap-6">

        {/* Header */}
        <div className="flex flex-col gap-1 text-center">
          <h2 className="text-white text-2xl sm:text-3xl font-bold">Reset Password</h2>
          <p className="text-slate-400 text-sm sm:text-base">
            Enter your UTM email and we'll send you a reset link.
          </p>
        </div>

        {/* Email Field */}
        <div className="flex flex-col gap-2">
          <label className="text-slate-400 text-xs sm:text-sm font-medium">
            UTM Email Address
          </label>
          <input
            type="email"
            placeholder="e.g. ahmad@graduate.utm.my"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base transition"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleResetPassword}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 active:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base transition-colors"
        >
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </button>

        {/* Message */}
        {message && (
          <p className={`text-sm sm:text-base text-center px-2 py-3 rounded-lg ${
            message.startsWith('✅')
              ? 'bg-green-500/10 text-green-400'
              : message.startsWith('⚠️')
              ? 'bg-yellow-500/10 text-yellow-400'
              : 'bg-red-500/10 text-red-400'
          }`}>
            {message}
          </p>
        )}

        {/* Back to Login */}
        <p className="text-center text-sm text-slate-400">
          Remembered your password?{' '}
          <Link href="/login" className="text-blue-400 underline hover:text-blue-300 transition-colors">
            Back to Login
          </Link>
        </p>

      </div>
    </div>
  );
}