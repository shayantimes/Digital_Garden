import "server-only";

export function productionEnvironmentProblems() {
  if (process.env.NODE_ENV !== "production") return [];
  const problems: string[] = [];
  const required = [
    "GARDEN_SESSION_SECRET",
    "GARDEN_SITE_URL",
    "GITHUB_OAUTH_CLIENT_ID",
    "GITHUB_OAUTH_CLIENT_SECRET",
    "GARDEN_ADMIN_GITHUB_USER",
    "GARDEN_ADMIN_GITHUB_ID",
    "GARDEN_GITHUB_TOKEN",
    "GARDEN_GITHUB_REPO",
    "GARDEN_GITHUB_BRANCH",
  ] as const;
  for (const name of required) if (!process.env[name]?.trim()) problems.push(`${name} is missing`);
  if ((process.env.GARDEN_SESSION_SECRET?.trim().length || 0) < 32) problems.push("GARDEN_SESSION_SECRET is too short");
  try {
    const site = new URL(process.env.GARDEN_SITE_URL || "");
    if (site.protocol !== "https:") problems.push("GARDEN_SITE_URL must use HTTPS");
    if (site.pathname !== "/" || site.search || site.hash) problems.push("GARDEN_SITE_URL must be an origin without a path");
  } catch {
    problems.push("GARDEN_SITE_URL is invalid");
  }
  if (!/^\d+$/.test(process.env.GARDEN_ADMIN_GITHUB_ID || "")) problems.push("GARDEN_ADMIN_GITHUB_ID must be numeric");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(process.env.GARDEN_GITHUB_REPO || "")) problems.push("GARDEN_GITHUB_REPO must use owner/repo format");
  return Array.from(new Set(problems));
}
