"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import styles from "../admin.module.css";

export default function ForgotPasswordPage() {
  const [identity, setIdentity] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity }),
      });
      const result = await response.json() as { message?: string; error?: string };
      setMessage(result.message || result.error || "If that account matches the owner, a reset email has been sent.");
    } catch {
      setMessage("The request could not be completed. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span>
        <p>Password recovery</p>
        <h1>Find your way back.</h1>
        <span>Enter your username or email. A private reset link will be sent to the owner email.</span>
        <form className={styles.authForm} onSubmit={submit}>
          <label>
            <span>Username or email</span>
            <input autoComplete="username" autoFocus maxLength={254} required value={identity} onChange={(event) => setIdentity(event.target.value)} />
          </label>
          {message ? <p className={styles.loginSuccess} role="status">{message}</p> : null}
          <button className={styles.authSubmit} disabled={pending} type="submit">{pending ? "Sending…" : "Email reset link"}</button>
        </form>
        <Link className={styles.loginBack} href="/admin/login">← Return to login</Link>
      </section>
    </main>
  );
}
