# Shayan’s Digital Garden

A private writing studio and public digital garden built with Next.js, Markdown, and GitHub.

## What this project guarantees

- Only GitHub account `shayantimes` (user ID `140486239`) can enter `/admin`.
- Drafts are excluded from every unauthenticated content response.
- Every content and media mutation requires an authenticated, same-origin request.
- Every note is an independent Markdown file with validated frontmatter.
- Images are checked by type, binary signature, and size before storage.
- Secrets remain server-side and are never exposed as `NEXT_PUBLIC_*` values.
- CI runs dependency audit, lint, type-checking, tests, and a production build.

See [Architecture](docs/ARCHITECTURE.md), [Admin login](docs/LOGIN.md), [Deployment](docs/DEPLOYMENT.md), and [Security policy](SECURITY.md).

## Writing workflow

Open `/admin` after signing in with GitHub:

- Use quick capture and press `⌘ Enter`.
- Import `.md`, `.mdx`, or `.txt` files.
- Paste or drop images into the writing canvas.
- Save privately as **Growing**.
- Preview and publish with one click.

Content lives under `content/posts/`; media lives under `public/uploads/`. Each studio save creates a focused GitHub commit and can trigger a new deployment.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
cp .env.example .env.local
```

Set `GARDEN_DEV_BYPASS_AUTH=true` only in `.env.local`, then:

```bash
npm ci
npm run dev
```

Open [http://localhost:3000/admin](http://localhost:3000/admin).

## Verification

```bash
npm run check
npm run audit
```

Never commit `.env.local`, tokens, OAuth secrets, or session secrets.

Tended with care in Shiraz.
