'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    // Clear previous messages and set UI to loading state before starting the network request
    setMessage('');
    setIsLoading(true);

    // Validate input to ensure the email field is not empty before calling the database
    if (!email) {
      setMessage('⚠️ Please enter your email address.');
      setIsLoading(false);
      return;
    }

    // Call Supabase Authentication API to send a password reset email
    // Used 'window.location.origin' to dynamically get the current domain
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    // Evaluate the response from Supabase
    // If error exists, display the error message. Otherwise, tell the user to check their inbox
    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      setMessage('✅ Password reset link sent! Check your email.');
    }
    
    // Turn off the loading state to re-enable inputs and buttons
    setIsLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Reset Password</h2>

        {/* Used standard HTML input for email
          Updates the 'email' state variable exactly as the user types
        */}
        <input
          type="email"
          placeholder="Enter your UTM Email"
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
        />

        {/* Used standard HTML button
          Triggers the handleResetPassword function when clicked
        */}
        <button 
          style={styles.button} 
          onClick={handleResetPassword}
          disabled={isLoading}
        >
          {isLoading ? 'Sending Link...' : 'Send Reset Link'}
        </button>

        {/* Conditionally renders the message paragraph only if 'message' state is not empty */}
        {message && <p style={styles.message}>{message}</p>}

        {/* Provides a quick way back to the login page if the user remembers their password */}
        <div style={styles.linkContainer}>
          <Link href="/login" style={styles.link}>
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

// Used same responsive CSS-in-JS
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
  title: { color: 'white', textAlign: 'center', margin: '0 0 10px 0' },
  input: { padding: '12px', borderRadius: '5px', border: 'none', outline: 'none', fontSize: '15px' },
  button: {
    padding: '12px', borderRadius: '5px', border: 'none', backgroundColor: '#3b82f6',
    color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px',
    transition: 'background-color 0.2s',
  },
  message: { color: '#e2e8f0', fontSize: '14px', textAlign: 'center', marginTop: '5px' },
  linkContainer: { textAlign: 'center', marginTop: '10px' },
  link: { color: '#60a5fa', textDecoration: 'underline', fontSize: '14px', cursor: 'pointer' },
};