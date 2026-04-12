'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function Login() {
  // State variables to store user inputs and UI feedback
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Next.js App Router navigation hook for redirecting users
  const router = useRouter();

  const handleLogin = async () => {
    // Reset message and set loading state before processing
    setMessage('');
    setIsLoading(true);

    // Basic validation to ensure fields are not empty
    if (!email || !password) {
      setMessage('⚠️ Please enter both email and password.');
      setIsLoading(false);
      return;
    }

    // Authenticate the user using Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setMessage('❌ ' + authError.message);
      setIsLoading(false);
      return;
    }

    // Fetch the user's role from the public.profiles table
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

    // Role-based redirection logic
    setMessage('✅ Login successful! Redirecting...');
    
    const userRole = profileData.role;
    
    // Redirect the user to their respective dashboard based on their role
    if (userRole === 'superadmin') {
      router.push('/superadmin');
    } else if (userRole === 'admin') {
      router.push('/admin');
    } else {
      // Default fallback is the student dashboard
      router.push('/student');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Login</h2>

        <input
          type="email"
          placeholder="UTM Email"
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
        />

        <button 
          style={styles.button} 
          onClick={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? 'Logging in...' : 'Login'}
        </button>

        {/* Navigation link to the registration page */}
        <div style={styles.linkContainer}>
          <span style={styles.linkText}>Don&apos;t have an account? </span>
          <Link href="/register" style={styles.link}>
            Register here
          </Link>
        </div>

        {/* Used Next.js Link component.
          Action: Navigates the user to the forgot password page.
          Positioned below the registration link as requested.
        */}
        <div style={{...styles.linkContainer, marginTop: '15px'}}>
          <Link href="/forgot-password" style={styles.link}>
            Forgot Password?
          </Link>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
    padding: '20px', 
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '30px',
    borderRadius: '10px',
    width: '100%',           
    maxWidth: '350px',        
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
  },
  title: {
    color: 'white',
    textAlign: 'center',
    margin: '0 0 10px 0',
  },
  input: {
    padding: '12px',
    borderRadius: '5px',
    border: 'none',
    outline: 'none',
    fontSize: '15px',
  },
  button: {
    padding: '12px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '5px',
    transition: 'background-color 0.2s',
  },
  message: {
    color: '#e2e8f0',
    fontSize: '14px',
    textAlign: 'center',
    marginTop: '5px',
  },
  linkContainer: {
    textAlign: 'center',
    marginTop: '10px',
  },
  linkText: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  link: {
    color: '#60a5fa',
    textDecoration: 'underline',
    fontSize: '14px',
    cursor: 'pointer',
  },
};