# Deployment Guide — realgradientdescent.tech

## Overview

Single container deployment behind Traefik. Uses DeepSeek V3 API for the copilot — no local LLM needed.

**RAM footprint:** ~200 MB (just the Node.js Astro server)

## Prerequisites

- DNS: `realgradientdescent.tech` A record → VPS IP
- DeepSeek API key from https://platform.deepseek.com/api_keys

---

## Deploy via OpenClaw

If OpenClaw has Docker access, give it these instructions:

```
1. Clone the repo to /opt/pradeep-portfolio:
   git clone https://github.com/PRADEEP_USERNAME/pradeep-portfolio.git /opt/pradeep-portfolio

2. Create .env from the example:
   cd /opt/pradeep-portfolio
   cp .env.example .env
   
3. Set the DeepSeek API key in .env:
   DEEPSEEK_API_KEY=sk-actual-key-here

4. Check the Traefik network name:
   docker network ls | grep -i traefik
   
   If it's NOT called "web", edit docker-compose.yml:
   networks.web.name should match your Traefik network name.

5. Build and start:
   docker compose up -d --build

6. Verify:
   docker ps | grep pradeep
   curl -I https://realgradientdescent.tech
```

## Deploy manually (SSH)

```bash
ssh root@YOUR_VPS_IP

# Clone
cd /opt
git clone https://github.com/YOUR_USERNAME/pradeep-portfolio.git
cd pradeep-portfolio

# Configure
cp .env.example .env
nano .env  # Add your DeepSeek API key

# Check Traefik network name
docker network ls | grep traefik
# If needed, update docker-compose.yml network name

# Deploy
docker compose up -d --build

# Verify
docker ps
curl -I https://realgradientdescent.tech
```

## Test the copilot

```bash
curl -X POST https://realgradientdescent.tech/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Who is Pradeep?"}]}'
```

## Update the site

```bash
cd /opt/pradeep-portfolio
git pull
docker compose up -d --build
```

## Architecture

```
Internet → Traefik (:443 SSL)
              │
              ├── realgradientdescent.tech → Astro app (:4321)
              │     ├── Static pages (prerendered, instant)
              │     └── /api/chat → DeepSeek V3 API (external)
              │                        └── Groq fallback (optional)
              │
              └── OpenClaw, FileBrowser (unchanged)
```

## Troubleshooting

**Traefik doesn't route:**
- Run `docker network ls` and match the network name in docker-compose.yml
- Run `docker network inspect YOUR_NETWORK` to verify pradeep-portfolio is connected
- Check Traefik logs: `docker logs traefik-traefik-1`

**Copilot returns errors:**
- Check logs: `docker logs pradeep-portfolio`
- Verify API key: the .env file must have a valid DEEPSEEK_API_KEY
- Test DeepSeek directly: `curl https://api.deepseek.com/models -H "Authorization: Bearer YOUR_KEY"`

**SSL not working:**
- Ensure DNS is propagated: `dig realgradientdescent.tech`
- Ensure Traefik certresolver name matches (default: `letsencrypt`)
