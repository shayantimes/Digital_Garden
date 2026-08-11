"use client";

import { useEffect } from "react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("[page:error]", error); }, [error]);
  return (
    <main className="garden-error-page">
      <p className="eyebrow">Something went wrong</p>
      <h1>The garden needs a moment.</h1>
      <p className="intro">Nothing you wrote has been changed. Try opening this page again.</p>
      <button className="garden-error-button" onClick={reset}>Try again</button>
    </main>
  );
}
