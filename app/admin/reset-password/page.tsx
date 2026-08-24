"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import styles from "../admin.module.css";

export default function ResetPasswordPage() {
  const accessToken = useRef("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    accessToken.current = fragment.get("access_token") || "";
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!accessToken.current) return setError("This reset link is invalid or expired. Request a new email.");
    if (password !== confirmation) return setError("The passwords do not match.");
    setPending(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: accessToken.current, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "The password could not be changed.");
      setComplete(true);
      setPassword("");
      setConfirmation("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The password could not be changed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span>
        <p>Password recovery</p>
        <h1>{complete ? "Password changed." : "Choose a new key."}</h1>
        {complete ? (
          <>
            <span>Your new password is ready. All new logins must use it.</span>
            <Link className={styles.primaryLogin} href="/admin/login">Return to login</Link>
          </>
        ) : (
          <>
            <span>Use at least 12 characters with uppercase, lowercase, a number, and a symbol.</span>
            <form className={styles.authForm} onSubmit={submit}>
              <label>
                <span>New password</span>
                <input autoComplete="new-password" minLength={12} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
              </label>
              <label>
                <span>Confirm new password</span>
                <input autoComplete="new-password" minLength={12} required type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
              </label>
              {error ? <p className={styles.loginError} role="alert">{error}</p> : null}
              <button className={styles.authSubmit} disabled={pending} type="submit">{pending ? "Changing…" : "Change password"}</button>
            </form>
            <Link className={styles.loginBack} href="/admin/forgot-password">Request another link</Link>
          </>
        )}
      </section>
    </main>
  );
}
