"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Please fill all fields");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      alert("Registered successfully! Check your email.");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Register</h2>

        <form onSubmit={handleRegister}>
          <input
            type="email"
            placeholder="Email"
            style={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Password"
            style={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit" style={styles.button}>
            Register
          </button>
        </form>

        <p style={styles.text}>Already have an account?</p>

        <a href="/login">
          <button style={styles.loginBtn}>Go to Login</button>
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0f172a",
  },
  card: {
    backgroundColor: "#1e293b",
    padding: "30px",
    borderRadius: "10px",
    width: "300px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
  },
  title: {
    color: "white",
    textAlign: "center",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    borderRadius: "5px",
    border: "none",
    outline: "none",
  },
  button: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#3b82f6",
    color: "white",
    cursor: "pointer",
  },
  text: {
    color: "#e2e8f0",
    textAlign: "center",
  },
  loginBtn: {
    width: "100%",
    padding: "10px",
    borderRadius: "5px",
    border: "none",
    backgroundColor: "#10b981",
    color: "white",
    cursor: "pointer",
  },
};