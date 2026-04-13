'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';
import { KeyRound, CheckCircle } from 'lucide-react';

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setIsLoading(true);

    if (!newPassword) {
      setMessage('⚠️ Please enter a new password.');
      setIsLoading(false);
      return;
    }

    // Call Supabase Auth to update the user's password in the database
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      setMessage('✅ Password updated successfully! Redirecting to login...');
      
      // Security best practice: Sign out the user immediately after password change
      await supabase.auth.signOut();
      
      // Delay redirection for 2 seconds to allow the user to read the success message
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }

    setIsLoading(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-slate-900">
      <div className="w-full max-w-[400px] bg-slate-800 rounded-xl shadow-md p-7 flex flex-col gap-6">
        
        {/* Visual Header indicating password security action */}
        <div className="text-center flex flex-col items-center">
          <div className="bg-blue-500/20 p-3 rounded-full mb-3">
            <KeyRound size={28} className="text-blue-400" />
          </div>
          <h2 className="text-white text-2xl font-bold">Set New Password</h2>
          <p className="text-slate-400 text-sm mt-2">
            Please enter your new secure password.
          </p>
        </div>

        <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
          <label className="text-slate-200 text-sm flex flex-col gap-1">
            New Password
            <input
              type="password"
              placeholder="Enter new password"
              className="w-full p-3 rounded-md bg-slate-700 text-white outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              onChange={(e) => setNewPassword(e.target.value)}
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
            {isLoading ? 'Updating...' : (
              <>
                <CheckCircle size={18} />
                Update Password
              </>
            )}
          </button>
        </form>

      </div>
    </main>
  );
}