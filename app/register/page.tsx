'use client';
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

//This manages user input using React state.
export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [matricNumber, setMatricNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const router = useRouter();

  const handleRegister = async () => {
    setMessage('');
    setIsLoading(true);

    // 1. Validate required fields
    if (!email || !password || !confirmPassword || !fullName || !matricNumber) {
      setMessage('⚠️ Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    // 2. UTM email check
    //This ensures only UTM emails are allowed, improving security.
    
    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      setMessage('❌ Only UTM email allowed (@utm.my or @graduate.utm.my).');
      setIsLoading(false);
      return;
    }

    // 3. Password match check
    if (password !== confirmPassword) {
      setMessage('❌ Passwords do not match.');
      setIsLoading(false);
      return;
    }

    // 4. Password length check
    //This ensures password strength
    if (password.length < 8) {
      setMessage('❌ Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    // 5. Sign up via Supabase Auth
    //This sends user data to Supabase and creates a secure account.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      if (authError.message.includes('rate limit')) {
        setMessage('⚠️ Too many attempts. Please wait a moment.');
      } else {
        setMessage('❌ ' + authError.message);
      }
      setIsLoading(false);
      return;
    }

    // 6. Update students table with full details
    // Profile row is auto-created by DB trigger, students row too
    if (authData.user) {
      const { error: studentError } = await supabase
        .from('students')
        .update({
          full_name: fullName,
          matric_number: matricNumber,
          phone: phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (studentError) {
        // Non-fatal — auth account created, just profile update failed
        console.error('Student profile update failed:', studentError.message);
      }
    }

    setMessage('✅ Registration successful! Please check your email to confirm your account.');
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="bg-slate-800 rounded-xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-5">

        {/* Title */}
        <h2 className="text-white text-2xl font-bold text-center">Register</h2>

        {/* Full Name */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">Full Name <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g. Ahmad bin Ali"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setFullName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Matric Number */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">Matric Number <span className="text-red-400">*</span></label>
          <input
            type="text"
            placeholder="e.g. A22EC0001"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setMatricNumber(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">UTM Email <span className="text-red-400">*</span></label>
          <input
            type="email"
            placeholder="e.g. ahmad@graduate.utm.my"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Phone */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">Phone Number <span className="text-slate-500">(optional)</span></label>
          <input
            type="tel"
            placeholder="e.g. 0123456789"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setPhone(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">Password <span className="text-red-400">*</span></label>
          <input
            type="password"
            placeholder="At least 8 characters"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Confirm Password */}
        <div className="flex flex-col gap-1">
          <label className="text-slate-400 text-xs font-medium">Confirm Password <span className="text-red-400">*</span></label>
          <input
            type="password"
            placeholder="Re-enter your password"
            className="w-full px-4 py-3 rounded-lg bg-slate-700 text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={isLoading}
          />
        </div>

        {/* Register Button */}
        <button
          onClick={handleRegister}
          disabled={isLoading}
          className="w-full py-3 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base transition-colors"
        >
          {isLoading ? 'Registering...' : 'Register'}
        </button>

        {/* Message */}
        {message && (
          <p className="text-slate-200 text-sm text-center">{message}</p>
        )}

        {/* Login link */}
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 underline hover:text-blue-300">
            Login here
          </Link>
        </p>

      </div>
    </div>
  );
}
