# Deployment Guide — realgradientdescent.tech

This document describes the canonical deployment of `realgradientdescent.tech`. It reflects the actual state of the VPS, not the original scaffold. If you change the deployment, update this file in the same commit.

---

## Overview

Single-container Astro app served by `@astrojs/node` (standalone mode), behind the existing Traefik reverse proxy on the VPS. The recruiter copilot is powered by DeepSeek V3 (OpenAI-compatible API) with optional Groq fallback — no local LLM, no GPU.

- **Domain:** https://realgradientdescent.tech
- **Container name:** `pradeep-portfolio`
- **VPS path:** `/opt/pradeep-portfolio`
- **GitHub:** https://github.com/realgradientdescent/pradeep-portfolio
- **Traefik network:** `openclaw-1ovr_default` (external — created by the existing OpenClaw stack)
- **RAM footprint:** ~200 MB

The container runs as a non-root user (`appuser`), with `no-new-privileges` set, and a Traefik-applied security header bundle (CSP, HSTS, frame-ancestors, permissions-policy).

---

## Prerequisites

- DNS: `realgradientdescent.tech` A record → VPS IPv4
- DeepSeek API key from https://platform.deepseek.com/api_keys
- An existing Traefik instance on the VPS with a network named `openclaw-1ovr_default` and a certresolver named `letsencrypt`. (If your Traefik setup uses different names, edit `docker-compose.yml` accordingly — see Troubleshooting.)

---

## Environment variables

Copy `.env.example` → `.env` and fill in:

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DEEPSEEK_API_KEY` | yes | — | Primary copilot LLM. |
| `SITE_ORIGIN` | yes | `https://realgradientdescent.tech` | Origin allowed to call `/api/chat`. CORS + sec-fetch-site checks rely on this. |
| `DEEPSEEK_MODEL` | no | `deepseek-chat` | `deepseek-chat` = V3, `deepseek-reasoner` = R1. |
| `GROQ_API_KEY` | no | — | If set, used as fallback when DeepSeek is unreachable. |

---

## First-time deploy (manual SSH)

```bash
ssh root@srv1573728.hstgr.cloud

# Clone
cd /opt
git clone https://github.com/realgradientdescent/pradeep-portfolio.git
cd pradeep-portfolio

# Configure
cp .env.example .env
nano .env   # set DEEPSEEK_API_KEY at minimum

# Confirm Traefik network exists
docker network ls | grep openclaw-1ovr_default
# If your Traefik uses a different network, edit the
# `networks:` section at the bottom of docker-compose.yml
# and the `networks:` line on the service.

# Build & start
docker compose up -d --build

# Verify
docker ps --filter name=pradeep-portfolio
curl -I https://realgradientdescent.tech
```

A healthy container will show `(healthy)` in `docker ps` after ~30s — the healthcheck hits `http://127.0.0.1:4321/` from inside the container (note: explicit IPv4 is required because the Alpine base image's `localhost` resolves to IPv6, which the Astro Node server does not bind to).

---

## Routine update (already deployed)

```bash
ssh root@srv1573728.hstgr.cloud
cd /opt/pradeep-portfolio
git pull
docker compose up -d --build
docker logs --tail 50 pradeep-portfolio
```

If the change includes Dockerfile or `docker-compose.yml` edits, the rebuild will pick them up automatically. If only `.env` changed, restart instead: `docker compose restart`.

---

## Patch-based deploy (when GitHub is behind the VPS)

This is what the workflow has actually been during development — local changes go to the VPS first, then GitHub catches up.

```bash
# On the dev machine
cd /path/to/local/checkout
git format-patch --binary -1 HEAD -o /tmp/

# Ship to VPS
scp /tmp/0001-*.patch root@srv1573728.hstgr.cloud:/tmp/

# On the VPS
cd /opt/pradeep-portfolio
git am /tmp/0001-*.patch
# If git am rejects the patch (working tree drift, manual edits on VPS):
#   git am --abort
#   git apply --reject /tmp/0001-*.patch
#   <resolve any .rej files manually>
#   git add -A && git commit -m "<original message>"
docker compose up -d --build
```

After the VPS is updated, push to GitHub from the dev machine to keep `origin/main` in sync.

---

## Test the copilot

```bash
# Anonymous (no Origin) — should be blocked by trusted-request gate
curl -sX POST https://realgradientdescent.tech/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Who is Pradeep?"}]}' -o /dev/null -w "%{http_code}\n"

# Same-origin (legit browser-like request) — should return a streamed response
curl -sX POST https://realgradientdescent.tech/api/chat \
  -H "Content-Type: application/json" \
  -H "Origin: https://realgradientdescent.tech" \
  -d '{"messages":[{"role":"user","content":"What kinds of roles is Pradeep targeting?"}]}'
```

Full automated coverage lives in `security-test.sh` at the repo root — input validation, CORS, prompt injection, rate limiting, info disclosure. Run it from the VPS:

```bash
ssh root@srv1573728.hstgr.cloud
bash /opt/pradeep-portfolio/security-test.sh
```

Expected: 18 passed, 0 failed, ~5 benign warnings (status code variations on rate-limited paths).

---

## Architecture

```
Internet → Traefik (:443 SSL, openclaw-1ovr_default network)
              │
              ├── realgradientdescent.tech → pradeep-portfolio container (:4321)
              │     ├── Static prerendered pages (instant)
              │     │     /, /resume, /about, /projects/*, /copilot, /ask, /contact
              │     └── /api/chat → DeepSeek V3 (external)
              │                        └── Groq fallback (optional)
              │
              └── OpenClaw, FileBrowser, etc. (unchanged, sharing the same Traefik)
```

Security header bundle (applied by Traefik middleware `security-headers`):
HSTS · CSP · X-Frame-Options · Referrer-Policy · Permissions-Policy · X-Content-Type-Options · X-XSS-Protection.

---

## Troubleshooting

**Traefik returns 404 for the domain**
- `docker network inspect openclaw-1ovr_default | grep pradeep` — confirm the container is attached.
- `docker logs <traefik-container>` — look for cert/router errors.
- Confirm the labels on `pradeep-portfolio` reference the correct certresolver (`letsencrypt`) and entrypoint (`websecure`).

**Container is `unhealthy` even though the site loads**
- Almost always the IPv4/IPv6 issue: the healthcheck must use `127.0.0.1`, not `localhost`. The committed Dockerfile already does this — verify it wasn't reverted by a manual edit.

**Copilot returns 5xx**
- `docker logs pradeep-portfolio --tail 100`
- Check `.env`: missing or invalid `DEEPSEEK_API_KEY` is the most common cause.
- Verify upstream: `curl https://api.deepseek.com/models -H "Authorization: Bearer $DEEPSEEK_API_KEY"`.

**Copilot returns 403 from the browser**
- The `SITE_ORIGIN` env var doesn't match the request's `Origin` header. In production this should be `https://realgradientdescent.tech` exactly (no trailing slash, no `www`).

**Rebuild doesn't pick up changes**
- `docker compose build --no-cache pradeep-portfolio && docker compose up -d`

**SSL not working**
- `dig realgradientdescent.tech` — confirm DNS points to the VPS.
- Confirm Traefik's certresolver name in `docker-compose.yml` (`letsencrypt`) matches the one configured in your Traefik static config.

---

## Related files

- `Dockerfile` — Node 22 Alpine multi-stage build, non-root user, IPv4 healthcheck
- `docker-compose.yml` — Traefik labels, security headers, network attachment, `no-new-privileges`
- `.env.example` — environment variable template
- `security-test.sh` — automated security regression suite
- `src/pages/api/chat.ts` — copilot API route (rate limiting, CORS, prompt-injection defenses, streaming)
- `src/data/source-pack.md` — grounding context the copilot reads from
