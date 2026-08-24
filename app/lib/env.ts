import "server-only";

export function productionEnvironmentProblems() {
  if (process.env.NODE_ENV !== "production") return [];
  const problems: string[] = [];
  const required = [
    "GARDEN_SITE_URL",
    "GARDEN_ADMIN_USERNAME",
    "GARDEN_ADMIN_EMAIL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "GARDEN_GITHUB_TOKEN",
    "GARDEN_GITHUB_REPO",
    "GARDEN_GITHUB_BRANCH",
  ] as const;
  for (const name of required) if (!process.env[name]?.trim()) problems.push(`${name} is missing`);
  try {
    const site = new URL(process.env.GARDEN_SITE_URL || "");
    if (site.protocol !== "https:") problems.push("GARDEN_SITE_URL must use HTTPS");
    if (site.pathname !== "/" || site.search || site.hash) problems.push("GARDEN_SITE_URL must be an origin without a path");
  } catch {
    problems.push("GARDEN_SITE_URL is invalid");
  }
  try {
    const supabase = new URL(process.env.SUPABASE_URL || "");
    if (supabase.protocol !== "https:") problems.push("SUPABASE_URL must use HTTPS");
  } catch {
    problems.push("SUPABASE_URL is invalid");
  }
  if (!/^[a-zA-Z0-9._-]{3,64}$/.test(process.env.GARDEN_ADMIN_USERNAME || "")) problems.push("GARDEN_ADMIN_USERNAME is invalid");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(process.env.GARDEN_ADMIN_EMAIL || "")) problems.push("GARDEN_ADMIN_EMAIL is invalid");
  if (process.env.GARDEN_ADMIN_USER_ID && !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(process.env.GARDEN_ADMIN_USER_ID)) problems.push("GARDEN_ADMIN_USER_ID must be a UUID when provided");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(process.env.GARDEN_GITHUB_REPO || "")) problems.push("GARDEN_GITHUB_REPO must use owner/repo format");
  return Array.from(new Set(problems));
}
