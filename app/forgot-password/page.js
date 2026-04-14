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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-900 to-slate-700">
      
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-xl w-80 border border-white/20">
        
        <h2 className="text-white text-2xl font-bold text-center mb-6">
          Reset Password
        </h2>

        <input
          type="email"
          placeholder="Enter your UTM Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          className="w-full p-3 rounded-lg bg-white/20 text-white placeholder-gray-300 outline-none focus:ring-2 focus:ring-blue-400 mb-4"
        />

        <button
          onClick={handleResetPassword}
          disabled={isLoading}
          className="w-full bg-blue-500 hover:bg-blue-600 transition p-3 rounded-lg text-white font-semibold"
        >
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </button>

        {message && (
          <p className="text-gray-300 text-sm text-center mt-3">{message}</p>
        )}

        <div className="text-center mt-4">
          <Link href="/login" className="text-blue-400 underline text-sm">
            Back to Login
          </Link>
        </div>

      </div>
    </div>
  );
}