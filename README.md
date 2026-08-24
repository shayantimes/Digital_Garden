# Shayan’s Digital Garden

A public personal garden with a private, single-owner writing studio. The taped-paper public website remains available to everyone; `/admin` is protected by a username-or-email and password login.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

Copy `.env.example` to `.env.local`, configure the private Supabase owner account, then open [http://localhost:3000](http://localhost:3000) or [http://localhost:3000/admin](http://localhost:3000/admin).

## Verification

```bash
npm run check
```

See [authentication setup](docs/AUTHENTICATION.md) and [production deployment](docs/DEPLOYMENT.md). Content is stored as one Markdown file per note under `content/posts/`.

Tended with care in Shiraz.
