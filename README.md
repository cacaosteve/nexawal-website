# NexaWal website

Static, no-JavaScript website for [NexaWal](https://nexawal.com). Independent, open-source Monero wallet by Nexatrode LLC.

## Design and content

- Local assets and system fonts only; no analytics, cookies, forms, or third-party runtime dependencies.
- Responsive layout, keyboard-accessible native FAQ and theme-preview controls, reduced-motion support.
- Illustrative HTML/CSS wallet preview: all shown balances and transfers are examples, not real wallet data or a screenshot.
- Platform links currently lead to source/build guides. Do not add store badges, audit claims, or F-Droid/WalletScrutiny endorsements without verifying them.
- Icon reused from the NexaWal GPUI app (`assets/nexawal-256.png`). No real wallet screenshots or keys are included.
- Privacy notice distinguishes this website from the app, RPC, rates, and explorer services. Platform terms are linked to their source rather than silently replaced.

## Check and run locally

Requires Node.js 20+ for the dependency-free checks, and Docker for the production server.

```sh
node --test scripts/site.test.mjs
docker build -t nexawal-website .
docker run --rm --name nexawal-website-preview -p 127.0.0.1:18097:8080 nexawal-website
```

Visit `http://127.0.0.1:18097`. In another terminal:

```sh
SITE_ORIGIN=http://127.0.0.1:18097 node --test scripts/site.test.mjs
```

Checks cover internal links/anchors, no-script/no-external-asset invariants, health endpoint, content/security/cache headers, redirects, and real HTTP 404 status.

## Railway

Deploy this repository's `main` branch as a separate Railway service using the root `Dockerfile` and `railway.json`.

- Caddy listens on `0.0.0.0:$PORT` (8080 by default). Railway terminates HTTPS.
- Health check: `/healthz`.
- No database, volume, secrets, build-time tokens, or background jobs.
- Runs as an unprivileged UID. The base image is pinned by digest; update deliberately after validation.
- `www.nexawal.com` redirects permanently to `https://nexawal.com`, preserving path and query.
- Attach apex and www custom domains to this service and use Railway's exact DNS records. Do not alter `rpc`, `rates`, or `explorer` DNS/services.
- No GitHub Actions workflows: local checks and Railway's deployment health check are used.
- No application access logging. Railway/network providers still process connection metadata; do not claim anonymous visits or zero provider logs.

After deployment, run the HTTP tests with `SITE_ORIGIN` set to the generated Railway URL or `https://nexawal.com`. Manually verify desktop/mobile layout, theme switch, FAQ disclosure, and keyboard focus. Updating `main` triggers Railway's connected GitHub deployment.

MIT licensed; see LICENSE. This website is not a wallet security audit or an application release.
