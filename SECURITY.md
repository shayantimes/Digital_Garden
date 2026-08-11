# Security policy

## Supported version

Only the latest commit on `main` is supported.

## Reporting a vulnerability

Do not open a public issue. Use GitHub’s **Private vulnerability reporting** feature for this repository. Include the affected route, reproduction steps, impact, and any suggested mitigation.

## Secrets

Secrets belong only in the deployment provider’s encrypted environment settings. Never place tokens or private credentials in commits, issues, screenshots, logs, or browser-side variables.

If a secret is exposed, revoke it at the provider immediately, create a replacement, update the deployment environment, and redeploy.
