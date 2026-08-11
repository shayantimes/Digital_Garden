# Shayan’s Digital Garden

A static personal garden built with Next.js. The main branch contains the public visual experience only: the taped-paper homepage, category pages, article pages, hover navigation, and responsive presentation.

The CMS and protected admin studio are intentionally maintained on the separate `agent/cms` branch.

## Local development

Requirements: Node.js 22 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Verification

```bash
npm run check
```

Public content and garden configuration live in `app/lib/garden-data.ts` and `app/lib/garden-config.ts`.

Tended with care in Shiraz.
