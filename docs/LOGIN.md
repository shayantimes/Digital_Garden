# Admin login

## Real GitHub login on localhost

1. In GitHub, open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Use `http://localhost:3000` as the homepage URL.
3. Use `http://localhost:3000/api/auth/callback` as the authorization callback URL.
4. Copy `.env.example` to `.env.local`.
5. Generate a session secret with `openssl rand -base64 48`.
6. Configure these values in `.env.local`:

```dotenv
GARDEN_SESSION_SECRET=YOUR_GENERATED_SECRET
GARDEN_SITE_URL=http://localhost:3000
GITHUB_OAUTH_CLIENT_ID=YOUR_OAUTH_CLIENT_ID
GITHUB_OAUTH_CLIENT_SECRET=YOUR_OAUTH_CLIENT_SECRET
GARDEN_ADMIN_GITHUB_USER=shayantimes
GARDEN_ADMIN_GITHUB_ID=140486239
GARDEN_DEV_BYPASS_AUTH=false
```

The GitHub repository token is optional during local development. Without it, studio saves write directly to local Markdown files. Never commit `.env.local`.

Start the application:

```bash
npm run dev
```

Visit `http://localhost:3000/admin`. You will be redirected to the login screen; select **Continue with GitHub**. Only the configured GitHub user ID and login are accepted.

## Fast local access without OAuth

For temporary local interface testing, set this in `.env.local`:

```dotenv
GARDEN_DEV_BYPASS_AUTH=true
```

Restart the development server and open `http://localhost:3000/admin`. There is no login step in bypass mode. The bypass is ignored when `NODE_ENV=production`.

## Production login

Create a separate production OAuth App using:

- Homepage: `https://YOUR_DOMAIN`
- Callback: `https://YOUR_DOMAIN/api/auth/callback`

Configure all production variables from `.env.example` in the hosting provider. Do not put production secrets in a file committed to GitHub. See `docs/DEPLOYMENT.md` for the full release procedure.
