"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import styles from "../admin.module.css";

export default function OwnerSetupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/setup", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { configured?: boolean; enabled?: boolean }) => {
        setConfigured(Boolean(result.configured));
        setEnabled(Boolean(result.enabled));
      })
      .catch(() => {
        setConfigured(false);
        setEnabled(false);
      });
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (password !== confirmation) return setError("The passwords do not match.");
    setPending(true);
    try {
      const response = await fetch("/api/auth/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const result = await response.json() as { error?: string; confirmationRequired?: boolean };
      if (!response.ok) throw new Error(result.error || "The owner account could not be created.");
      setMessage(result.confirmationRequired
        ? "Account created. Open the confirmation email from Supabase, then return to login."
        : "Account created. You can sign in now.");
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The owner account could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span>
        <p>One-time owner setup</p>
        <h1>Create your key.</h1>
        <span>This creates the only account allowed into the garden studio.</span>
        {enabled === false ? (
          <p className={styles.setupNotice}>Owner setup is locked. Sign in with the existing owner account.</p>
        ) : configured === false ? (
          <p className={styles.setupNotice}>First connect Supabase by adding <code>SUPABASE_URL</code> and <code>SUPABASE_PUBLISHABLE_KEY</code> to <code>.env.local</code>, then restart the site.</p>
        ) : null}
        {enabled === true ? <form className={styles.authForm} onSubmit={submit}>
          <label>
            <span>Username</span>
            <input autoComplete="username" maxLength={64} required value={username} onChange={(event) => setUsername(event.target.value)} />
          </label>
          <label>
            <span>Owner email</span>
            <input autoComplete="email" maxLength={254} required type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </label>
          <label>
            <span>Create password</span>
            <input autoComplete="new-password" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label>
            <span>Confirm password</span>
            <input autoComplete="new-password" minLength={12} required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
          </label>
          <small className={styles.passwordHint}>At least 12 characters with uppercase, lowercase, a number, and a symbol.</small>
          {error ? <p className={styles.loginError} role="alert">{error}</p> : null}
          {message ? <p className={styles.loginSuccess} role="status">{message}</p> : null}
          <button className={styles.authSubmit} disabled={pending || configured !== true || Boolean(message)} type="submit">{pending ? "Creating…" : "Create owner account"}</button>
        </form> : null}
        <Link className={styles.loginBack} href="/admin/login">← Return to login</Link>
      </section>
    </main>
  );
}
