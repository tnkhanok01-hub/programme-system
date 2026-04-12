'use client';

import { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleRegister = async () => {
    setMessage('');

    if (
      !email.endsWith('@utm.my') &&
      !email.endsWith('@graduate.utm.my')
    ) {
      setMessage('❌ Only UTM email allowed');
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        setMessage('⚠️ Too many attempts. Please wait a moment.');
      } else {
        setMessage('❌ ' + error.message);
      }
    } else {
      setMessage('✅ Check your email for confirmation!');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register</h2>

        <input
          type="email"
          placeholder="UTM Email"
          style={styles.input}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          style={styles.input}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.button} onClick={handleRegister}>
          Register
        </button>

        {message && <p style={styles.message}>{message}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
  card: {
    backgroundColor: '#1e293b',
    padding: '30px',
    borderRadius: '10px',
    width: '300px',
    display: 'flex',
    flexDirection: 'column',
    gap: '15px',
  },
  title: {
    color: 'white',
    textAlign: 'center',
  },
  input: {
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    outline: 'none',
  },
  button: {
    padding: '10px',
    borderRadius: '5px',
    border: 'none',
    backgroundColor: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
  },
  message: {
    color: '#e2e8f0',
    fontSize: '14px',
    textAlign: 'center',
  },
};