const baseUrl = new URL(process.argv[2] || "http://127.0.0.1:3000");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const contentResponse = await fetch(new URL("/api/content", baseUrl));
const content = await contentResponse.json();
assert(contentResponse.ok, "Public content endpoint is unavailable.");
assert(Array.isArray(content.posts) && content.posts.length > 0, "Public content endpoint returned no posts.");
assert(content.posts.every((post) => post.status === "Published"), "A draft leaked through the public content endpoint.");

const adminResponse = await fetch(new URL("/admin", baseUrl), { redirect: "manual" });
assert([302, 303, 307, 308].includes(adminResponse.status), "Signed-out /admin did not redirect.");
assert(adminResponse.headers.get("location")?.includes("/admin/login"), "Signed-out /admin redirected to the wrong location.");

const loginPageResponse = await fetch(new URL("/admin/login", baseUrl));
const loginPage = await loginPageResponse.text();
assert(loginPageResponse.ok && loginPage.includes("Username or email"), "The password login page is unavailable.");
assert(!loginPage.includes("Continue with GitHub"), "The removed GitHub login is still visible.");

const removedOAuthResponse = await fetch(new URL("/api/auth/callback", baseUrl), { redirect: "manual" });
assert(removedOAuthResponse.status === 404, "The removed OAuth callback still exists.");

const csrfResponse = await fetch(new URL("/api/content", baseUrl), {
  method: "PUT",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ post: {} }),
});
assert(csrfResponse.status === 403, "A cross-site-style write was not rejected.");

const unauthorizedResponse = await fetch(new URL("/api/content", baseUrl), {
  method: "PUT",
  headers: { "Content-Type": "application/json", Origin: baseUrl.origin },
  body: JSON.stringify({ post: {} }),
});
assert(unauthorizedResponse.status === 401, "An unauthenticated same-origin write was not rejected.");

const settingsResponse = await fetch(new URL("/api/settings", baseUrl));
const settings = await settingsResponse.json();
assert(settingsResponse.ok && settings.settings?.headerName, "Public homepage settings are unavailable.");

const settingsWriteResponse = await fetch(new URL("/api/settings", baseUrl), {
  method: "PUT",
  headers: { "Content-Type": "application/json", Origin: baseUrl.origin },
  body: JSON.stringify({ settings: {} }),
});
assert(settingsWriteResponse.status === 401, "Unauthenticated homepage settings changes were not rejected.");

const accountResponse = await fetch(new URL("/api/account", baseUrl));
assert(accountResponse.status === 401, "Private account details leaked without authentication.");

const backupResponse = await fetch(new URL("/api/backup", baseUrl));
assert(backupResponse.status === 401, "A garden backup was available without authentication.");

const healthResponse = await fetch(new URL("/api/health", baseUrl));
const health = await healthResponse.json();
assert(healthResponse.ok && health.status === "ok", "Production health check is not healthy.");

const homeResponse = await fetch(baseUrl);
assert(homeResponse.headers.has("content-security-policy"), "Content-Security-Policy header is missing.");
assert(homeResponse.headers.get("x-frame-options") === "DENY", "Clickjacking protection is missing.");
assert(homeResponse.headers.get("x-content-type-options") === "nosniff", "MIME sniffing protection is missing.");

console.log(JSON.stringify({
  status: "ok",
  publishedPosts: content.posts.length,
  checks: ["draft privacy", "password login", "OAuth removal", "admin redirect", "CSRF", "authorization", "homepage settings", "account privacy", "backup privacy", "health", "security headers"],
}, null, 2));
