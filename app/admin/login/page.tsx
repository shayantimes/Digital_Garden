import Link from "next/link";
import { redirect } from "next/navigation";
import { currentSession, developmentAuthBypass } from "../../lib/session";
import styles from "../admin.module.css";

const errors: Record<string, string> = {
  access_denied: "GitHub sign-in was cancelled.",
  invalid_state: "The sign-in request expired or could not be verified. Please try again.",
  not_configured: "GitHub authentication is not configured on this deployment.",
  not_owner: "This studio is private and only the repository owner can enter.",
  oauth_failed: "GitHub could not complete sign-in. Please try again.",
  profile_failed: "Your GitHub identity could not be verified.",
};

export const dynamic = "force-dynamic";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentSession()) redirect("/admin");
  const { error } = await searchParams;
  const message = error ? errors[error] || "Sign-in could not be completed." : "";

  return (
    <main className={styles.loginPage}>
      <section className={styles.loginCard}>
        <span className={styles.loginMark}>✦</span>
        <p>Private writing space</p>
        <h1>Come tend your garden.</h1>
        <span>Sign in with the GitHub account that owns this garden. No other account is allowed.</span>
        {message ? <p className={styles.loginError}>{message}</p> : null}
        {developmentAuthBypass() ? (
          <Link className={styles.githubLogin} href="/admin">Open local studio</Link>
        ) : (
          <Link className={styles.githubLogin} href="/api/auth/login">Continue with GitHub</Link>
        )}
        <Link className={styles.loginBack} href="/">← Back to the garden</Link>
      </section>
    </main>
  );
}
