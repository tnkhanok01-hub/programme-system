'use client';
import { Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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

    if (!email || !password || !confirmPassword || !fullName || !matricNumber) {
      setMessage('⚠️ Please fill in all required fields.');
      setIsLoading(false);
      return;
    }

    if (!email.endsWith('@utm.my') && !email.endsWith('@graduate.utm.my')) {
      setMessage('❌ Only UTM email allowed.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage('❌ Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setMessage('❌ Password must be at least 8 characters.');
      setIsLoading(false);
      return;
    }

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
        matric_number: matricNumber,
        phone,
      }),
    });

    const data = await res.json();

    console.log("REGISTER RESPONSE:", data);

    if (!res.ok) {
      setMessage('❌ ' + data.error);
      setIsLoading(false);
      return;
    }

    setMessage('✅ Registration successful! Redirecting to login...');
    setIsLoading(false);

    setTimeout(() => {
      router.push('/login');
    }, 1500);
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
