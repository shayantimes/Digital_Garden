import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="garden-error-page">
      <p className="eyebrow">404 · Not found</p>
      <h1>This path hasn’t been planted.</h1>
      <Link className="text-link" href="/">Return to the garden →</Link>
    </main>
  );
}
