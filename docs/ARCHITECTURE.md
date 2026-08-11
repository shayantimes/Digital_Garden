# Architecture

## Project organization

This is one Next.js application with a strict frontend/backend boundary, rather than two separately deployed services:

```text
app/
  components/       Public garden frontend
  admin/            Protected writing-studio frontend
  api/              Server backend: auth, content, health, and media
  lib/
    garden-content  Browser API client
    server-content  Server-only Markdown/GitHub repository adapter
    session*        Server-only owner session and authorization
content/posts/      One validated Markdown file per note
public/uploads/     Validated uploaded images
tests/              Content and authentication tests
scripts/            Production smoke checks
.github/            CI, ownership, PR, and dependency automation
```

Keeping the backend in Next.js route handlers gives the browser one same-origin API, keeps every secret server-side, and avoids operating a second server for a single-owner garden.

## Trust boundaries

- The public garden can read only published notes from the deployed Markdown files.
- `/admin` is protected by a server-side session check.
- GitHub OAuth accepts only GitHub user ID `140486239` and login `shayantimes` unless explicitly reconfigured.
- Content and media mutations require a valid owner session and a same-origin request.
- GitHub and OAuth secrets stay in server-only modules and environment variables.

## Content model

Each note is an independent file under `content/posts/`. The filename is the stable note ID, so changing a title or URL does not break Git history. Markdown is the body; validated YAML frontmatter contains publishing metadata.

Published deployments read bundled Markdown files. The authenticated studio reads the current GitHub repository so it sees the latest commit. Saving a note creates a focused GitHub commit, which can trigger the hosting provider’s next deployment.

Images are validated by MIME type, file signature, and size before being written to `public/uploads/`.

## Failure behavior

- Invalid or oversized content returns a safe 4xx response and is not written.
- GitHub conflicts ask the editor to reload instead of overwriting silently.
- A missing production token makes the studio read-only; public content remains available.
- A missing or weak session secret prevents authenticated sessions from being accepted.

## Recovery

Git is the audit log and rollback mechanism. Revert the relevant content or media commit and redeploy. The studio also provides a JSON backup download for an additional portable copy.
