"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import styles from "../admin.module.css";

export default function AdminLoginPage() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void fetch("/api/auth", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { authenticated?: boolean }) => {
        if (result.authenticated) router.replace("/admin");
      })
      .catch(() => undefined);
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "Login failed.");
      router.replace("/admin");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Login failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span>
        <p>Private writing space</p>
        <h1>Come tend your garden.</h1>
        <span>Enter your private username or email and password.</span>
        <form className={styles.authForm} onSubmit={submit}>
          <label>
            <span>Username or email</span>
            <input autoComplete="username" autoFocus maxLength={254} required value={identity} onChange={(event) => setIdentity(event.target.value)} />
          </label>
          <label>
            <span>Password</span>
            <input autoComplete="current-password" maxLength={1024} required type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          {error ? <p className={styles.loginError} role="alert">{error}</p> : null}
          <button className={styles.authSubmit} disabled={pending} type="submit">{pending ? "Checking…" : "Enter the studio"}</button>
        </form>
        <Link className={styles.forgotLink} href="/admin/forgot-password">Forgot password?</Link>
        <Link className={styles.loginBack} href="/">← Back to the garden</Link>
      </section>
    </main>
  );
}
