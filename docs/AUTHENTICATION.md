# Private admin authentication

The public garden remains open. Only `/admin` and its content-writing APIs require authentication.

## How it works

- The login form accepts either `GARDEN_ADMIN_USERNAME` or `GARDEN_ADMIN_EMAIL`.
- Supabase Auth stores and verifies the password. The application never stores or logs the password.
- The authenticated Supabase access token is kept in a short-lived, HTTP-only, same-site cookie.
- Every protected page and write API verifies the token and checks both the immutable Supabase user UUID and owner email.
- Forgot-password requests always return the same message, so visitors cannot discover the owner identity.
- The email reset link opens `/admin/reset-password`, where the owner chooses a new strong password.

GitHub OAuth is not used. The optional GitHub repository token is only the CMS publishing transport for Markdown and images.

## Supabase setup

1. Create a Supabase project.
2. Open **Authentication → Providers → Email** and keep email/password enabled.
3. Open **Project Settings → API** and copy the project URL and publishable key into `.env.local`.
4. Under **Authentication → URL Configuration**, set the Site URL and add these local redirect URLs:
   - `http://localhost:3000/admin/login`
   - `http://localhost:3000/admin/reset-password`
5. Temporarily set `GARDEN_OWNER_SETUP_ENABLED=true`, restart the site, and open `http://localhost:3000/admin/setup`.
6. Enter the exact configured username and email, choose your password, and create the owner account.
7. Confirm the email, remove `GARDEN_OWNER_SETUP_ENABLED` (or set it to `false`), restart the site, and disable public signups in Supabase because this garden has one owner.
8. Optionally copy the new user's UUID into `GARDEN_ADMIN_USER_ID` for an extra identity check.
9. Add the two equivalent `https://YOUR_DOMAIN/...` URLs before production.
10. For production reset-email delivery, configure a custom SMTP provider under **Authentication → Emails → SMTP Settings**. Verify SPF, DKIM, and DMARC for the sending domain.

## Local configuration

Copy `.env.example` to `.env.local`, fill the owner and Supabase values, and temporarily enable the one-time setup switch. Create the account once at `http://localhost:3000/admin/setup`. After confirming the email, lock setup again and open `http://localhost:3000/admin` to sign in with either the username or email plus the same password.

There is intentionally no local authentication bypass.
