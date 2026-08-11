# Production deployment

This runbook assumes GitHub plus a Node.js hosting provider such as Vercel.

## 1. Prepare the GitHub repository

In **Settings → General**, keep `main` as the default branch and disable force pushes and branch deletion through a ruleset.

Create a branch ruleset for `main`:

- Require a pull request before merging.
- Require the `verify` status check from `.github/workflows/ci.yml`.
- Require branches to be up to date before merging.
- Block force pushes and deletions.
- Require conversation resolution.

In **Settings → Code security**, enable Dependabot alerts, Dependabot security updates, secret scanning, push protection, and private vulnerability reporting where available.

## 2. Create the GitHub OAuth App

Create an OAuth App under GitHub **Developer settings → OAuth Apps**.

- Homepage URL: `https://YOUR_DOMAIN`
- Authorization callback URL: `https://YOUR_DOMAIN/api/auth/callback`

Copy its client ID and generate a client secret. The OAuth flow requests only `read:user`; it uses the returned immutable GitHub user ID and login to authorize the owner. The OAuth access token is used once to read the profile and is never persisted.

## 3. Create the repository write token

Create a fine-grained personal access token:

- Resource owner: `shayantimes`
- Repository access: only `Digital_Garden`
- Repository permission: **Contents — Read and write**
- Expiration: choose a short operational period and rotate it before expiry

No Actions, administration, issues, pull requests, or account-wide permissions are required.

## 4. Configure production environment variables

Add these only in the hosting provider’s encrypted environment settings:

| Variable | Production value |
| --- | --- |
| `GARDEN_SESSION_SECRET` | Output of `openssl rand -base64 48` |
| `GARDEN_SITE_URL` | Exact canonical origin, such as `https://garden.example.com` |
| `GITHUB_OAUTH_CLIENT_ID` | OAuth App client ID |
| `GITHUB_OAUTH_CLIENT_SECRET` | OAuth App client secret |
| `GARDEN_ADMIN_GITHUB_USER` | `shayantimes` |
| `GARDEN_ADMIN_GITHUB_ID` | `140486239` |
| `GARDEN_GITHUB_TOKEN` | Fine-grained repository token |
| `GARDEN_GITHUB_REPO` | `shayantimes/Digital_Garden` |
| `GARDEN_GITHUB_BRANCH` | `main` |

Do not set `GARDEN_DEV_BYPASS_AUTH` in production. The code ignores it when `NODE_ENV=production` regardless.

## 5. Deploy

Connect the hosting project to this repository and deploy `main`. The runtime must support Node.js route handlers; a static-only export is not sufficient.

Set the production domain before completing the OAuth App callback URL. Redeploy after adding or rotating environment values.

## 6. Release checks

Before announcing the site:

1. Confirm `npm run check` and `npm run audit` pass.
2. Visit a published post while signed out.
3. Request `/api/content` while signed out and confirm no draft title or body is present.
4. Visit `/admin` while signed out and confirm redirect to `/admin/login`.
5. Try a different GitHub account and confirm access is denied.
6. Sign in as `shayantimes`, save a draft, and confirm a single Markdown commit appears.
7. Publish the draft and confirm the host creates a successful deployment.
8. Upload a valid image and reject a renamed non-image file.
9. Confirm security headers with the hosting provider’s response inspector.
10. Confirm `/api/health` returns HTTP 200 with `{ "status": "ok" }`.

## Rollback

Revert the content or application commit in GitHub and redeploy. If authentication or publishing credentials may be exposed, revoke them first, replace the deployment variables, then redeploy.

## Rotation schedule

- Rotate the GitHub token at or before its configured expiration.
- Rotate the OAuth client secret and session secret after suspected exposure.
- Rotating `GARDEN_SESSION_SECRET` signs out all existing studio sessions immediately.
