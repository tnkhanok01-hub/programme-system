'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabaseClient';

export default function UpdatePassword() {
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const router = useRouter();

  const handleUpdatePassword = async () => {
    setMessage('');
    setIsLoading(true);

    if (!newPassword) {
      setMessage('⚠️ Please enter a new password.');
      setIsLoading(false);
      return;
    }

    // Action: Call Supabase Authentication API to update the currently logged-in user's data.
    // Note: Clicking the email link temporarily logs the user in, making this secure call possible.
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    // Evaluate response. If successful, sign out to force a fresh login with the new credentials.
    if (error) {
      setMessage('❌ ' + error.message);
    } else {
      setMessage('✅ Password updated successfully! Redirecting to login...');
      
      // Force logout so the user must use their new password.
      await supabase.auth.signOut();
      
      // Delay navigation by 2 seconds so the user can read the success message.
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }

    setIsLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Set New Password</h2>

        {/* Used standard HTML password input.
          Captures the new password from the user.
        */}
        <input
          type="password"
          placeholder="Enter new password"
          style={styles.input}
          onChange={(e) => setNewPassword(e.target.value)}
          disabled={isLoading}
        />

        <button 
          style={styles.button} 
          onClick={handleUpdatePassword}
          disabled={isLoading}
        >
          {isLoading ? 'Updating...' : 'Update Password'}
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

// Used same responsive styles
const styles = {
  container: { minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a', padding: '20px' },
  card: { backgroundColor: '#1e293b', padding: '30px', borderRadius: '10px', width: '100%', maxWidth: '350px', display: 'flex', flexDirection: 'column', gap: '18px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
  title: { color: 'white', textAlign: 'center', margin: '0 0 10px 0' },
  input: { padding: '12px', borderRadius: '5px', border: 'none', outline: 'none', fontSize: '15px' },
  button: { padding: '12px', borderRadius: '5px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '5px', transition: 'background-color 0.2s' },
  message: { color: '#e2e8f0', fontSize: '14px', textAlign: 'center', marginTop: '5px' }
};