# Production deployment

## Required secrets

Set every value from `.env.example` in the hosting provider's encrypted environment settings. Change `GARDEN_SITE_URL` to the exact HTTPS production origin. Never commit `.env.local`.

The Supabase project must contain exactly the intended owner account. After creating it, adding its immutable UUID as `GARDEN_ADMIN_USER_ID` provides an additional identity check.

## Password-reset email

Configure custom SMTP in Supabase before launch. Add `https://YOUR_DOMAIN/admin/reset-password` to the allowed redirect URLs and make the production domain the Site URL. Test the full reset flow before publishing.

## GitHub content publishing

`GARDEN_GITHUB_TOKEN` is a fine-grained token limited to this repository with only **Contents: Read and write**. It never authenticates the owner. Each CMS save creates a focused Markdown commit and triggers the normal deployment workflow.

## Release checks

1. Run `npm run check` and `npm run audit`.
2. Confirm the public homepage works while signed out.
3. Confirm `/admin` redirects to `/admin/login`.
4. Confirm both username and email can log in with the same password.
5. Confirm a wrong identity and wrong password return the same error.
6. Request a reset email and change the password.
7. Confirm the old password fails and the new password succeeds.
8. Save a draft and verify it is not returned to signed-out visitors.
9. Publish a note and confirm a focused GitHub commit and successful deployment.
10. Confirm `/api/health` returns HTTP 200.
