# Pradeep AI — V1 Detailed Build Specification

**Domain:** realgradientdescent.tech
**Owner:** Pradeep (Software Engineering Director)
**Target launch:** April 25, 2026
**Last updated:** April 11, 2026

---

## 1. Executive Summary

Build a recruiter-facing portfolio experience at realgradientdescent.tech that positions Pradeep as an engineering leader with deep AI enablement expertise and hands-on building credibility. The site combines three layers: a polished portfolio (trust), flagship project pages (proof), and a self-hosted AI copilot (interaction) — all designed to help recruiters, hiring managers, and peers understand Pradeep's value in under 3 minutes.

**Target roles:**
- VP/Director of Engineering — AI Enablement
- Head of AI/ML Platform
- Product Engineer / Builder (AI-native products)
- Technical leadership at AI-forward companies

**Positioning angle:** Not just a leader who talks about AI — a Director who builds AI systems hands-on, thinks in agentic workflows, and ships practical tools. The portfolio itself is proof of that.

---

## 2. Technical Architecture

### 2.1 Stack Decision

| Layer | Choice | Rationale |
|---|---|---|
| **Frontend framework** | **Astro 5.x** | Static-first = tiny bundles, fast TTFB. React islands for interactive chat widget. Lighter than Next.js on a constrained VPS. Built-in SSG means Nginx serves pre-built HTML. |
| **Interactive components** | **React 18** (Astro islands) | Chat widget, project cards with hover states, mobile nav. Only loads JS where needed. |
| **Styling** | **Tailwind CSS 4** | Utility-first, pairs well with Astro, easy to maintain dark theme. |
| **Copilot API** | **Astro server endpoints** (or standalone Express) | Proxies requests to Ollama. Handles rate limiting, context injection, response streaming. |
| **LLM inference** | **Ollama + Llama 3.2 3B** (primary) | Self-hosted on VPS. ~3-4GB RAM usage. Acceptable response times for 3B model on CPU. |
| **LLM fallback** | **Groq free tier + Llama 3.1 8B** | If self-hosted is too slow or VPS is under load. Sub-second responses. Automatic failover. |
| **Reverse proxy** | **Nginx** | SSL termination (Let's Encrypt), static file serving, proxy to Astro dev server / Ollama. |
| **Containerization** | **Docker Compose** | One `docker-compose.yml` runs: Astro app, Ollama, Nginx. Easy deploys. |
| **Hosting** | **Hostinger KVM2 VPS** | 8GB RAM, 2 cores. Ubuntu 22.04. |

### 2.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────┐
│                  Hostinger KVM2 VPS                  │
│                  8GB RAM / 2 Cores                   │
│                                                      │
│  ┌──────────┐    ┌─────────────┐    ┌────────────┐  │
│  │  Nginx   │───▶│  Astro App  │───▶│   Ollama   │  │
│  │  :443    │    │  :4321      │    │   :11434   │  │
│  │  SSL/CDN │    │  Static +   │    │  Llama3.2  │  │
│  │          │    │  API routes │    │  3B (~3GB) │  │
│  └──────────┘    └──────────────┘    └────────────┘  │
│       │                │                              │
│       │                │ (fallback)                   │
│       │                ▼                              │
│       │          ┌───────────┐                        │
│       │          │ Groq API  │ (external, free tier)  │
│       │          └───────────┘                        │
└───────┼─────────────────────────────────────────────-─┘
        │
   ┌────▼────┐
   │  Users  │
   │ (HTTPS) │
   └─────────┘
```

### 2.3 Resource Budget (8GB RAM)

| Service | Estimated RAM | Notes |
|---|---|---|
| Ollama + Llama 3.2 3B | ~3.5GB | Loaded in memory when first query hits |
| Astro (Node.js SSR) | ~200MB | Mostly serves static files |
| Nginx | ~50MB | Lightweight |
| OS + overhead | ~500MB | Ubuntu base |
| **Headroom** | **~3.7GB** | Comfortable margin |

### 2.4 Performance Targets

| Metric | Target | Notes |
|---|---|---|
| First Contentful Paint | < 1.2s | Static HTML, minimal JS |
| Largest Contentful Paint | < 2.0s | Hero section with avatar |
| Copilot first response (local) | < 8s | Llama 3.2 3B on CPU |
| Copilot first response (Groq) | < 1.5s | Fallback path |
| Lighthouse score | > 90 | All categories |

---

## 3. Information Architecture

### 3.1 Sitemap

```
realgradientdescent.tech/
├── /                    → Homepage (hero, positioning, featured projects, CTA)
├── /projects/           → Project index (card grid)
│   ├── /projects/[slug] → Individual project deep-dives
├── /about               → Professional background, working style, philosophy
├── /ask                 → Recruiter copilot (dedicated chat page)
└── /resume              → Downloadable resume + structured summary
```

### 3.2 Navigation

**Desktop:** Horizontal nav bar — `Home` · `Projects` · `About` · `Ask Pradeep AI` · `Resume`
**Mobile:** Hamburger menu with the same items
**Persistent CTA:** "Ask Pradeep AI" button visible on all pages (links to /ask)

---

## 4. Page-by-Page Specifications

### 4.1 Homepage ( / )

**Purpose:** Establish who Pradeep is in < 30 seconds. Create two paths: browse the portfolio or jump to the copilot.

**Sections (scroll order):**

1. **Hero**
   - Avatar (custom-created, see section 7)
   - Name: Pradeep [Last Name]
   - Headline: e.g., "Engineering Leader. AI Builder. Systems Thinker."
   - One-line positioning: e.g., "I lead engineering teams and build practical AI systems — from agentic workflows to the copilot you're about to talk to."
   - Two CTAs: `View Projects` and `Ask Pradeep AI`

2. **What I Do (positioning block)**
   - 3-4 short cards or columns:
     - AI Enablement & Strategy
     - Agentic Systems & Workflows
     - Product-Minded Engineering Leadership
     - Hands-On Building
   - Each card: icon + 2-sentence description

3. **Featured Projects**
   - 3 project cards (the strongest ones)
   - Each card: project name, one-line summary, key tech tags, thumbnail/screenshot
   - Click → /projects/[slug]

4. **How I Think (philosophy block)**
   - Short section (3-4 paragraphs or a quote-style layout)
   - Topics: practical AI over hype, building to learn, systems thinking, product taste
   - This replaces the generic "about me" blurb most portfolios have

5. **Ask Pradeep AI (teaser)**
   - 3-4 suggested prompt chips: "60-second summary", "What roles fit Pradeep?", "Best projects", "How does he think about AI agents?"
   - Clicking a chip → navigates to /ask with that prompt pre-filled
   - Short copy: "I built a copilot grounded in my real professional context. Ask it anything about my background."

6. **CTA Footer**
   - "Let's talk" with LinkedIn, email, resume download links
   - Clean, minimal

### 4.2 Project Pages ( /projects/[slug] )

**Template structure for each project:**

1. **Project header:** Name, one-line description, tech tags, status (live/archived/in-progress)
2. **The Problem:** What was the gap or opportunity? (2-3 sentences)
3. **The Approach:** How did Pradeep think about solving it? (product thinking, not just tech)
4. **What Was Built:** Architecture overview, key features, screenshots/diagrams
5. **Implementation Notes:** Interesting technical decisions, tradeoffs, what was hard
6. **Lessons Learned:** What this project taught — honest, specific
7. **Why It Matters:** How this connects to Pradeep's broader direction
8. **Links:** Demo, repo, related writing (if applicable)

### 4.3 About Page ( /about )

**Sections:**

1. **Professional Summary** — 2-3 paragraphs covering career arc, current focus, and what drives him
2. **Strengths** — Framed as capabilities, not buzzwords. E.g., "Translating AI research into production systems" not "AI/ML"
3. **Working Style** — How he leads teams, approaches problems, makes decisions
4. **What I'm Looking For** — Target role framing: what kind of problems, teams, and companies excite him
5. **Background** — Brief career history (from LinkedIn data), education, certifications if relevant

### 4.4 Ask Pradeep AI ( /ask )

**Full-page chat experience.**

**Layout:**
- Left sidebar (desktop): Suggested prompt categories
  - "Quick Overview" — 60-second summary, role fit, what makes him different
  - "Projects" — best projects, what he built, tech deep-dives
  - "Working Style" — how he leads, how he thinks, collaboration approach
  - "AI Perspective" — views on agents, memory, automation, practical AI
- Main area: Chat interface with message bubbles
- Top: Brief intro text — "This copilot is grounded in Pradeep's approved professional context. Ask it anything about his background, projects, or perspective."

**Chat UX details:**
- Streaming responses (tokens appear as generated)
- Markdown rendering in responses (bold, links, lists)
- "Copy response" button on each message
- 3-4 starter prompt chips shown before first message
- Session-based (no login required, no history persistence)
- Rate limiting: max 20 messages per session, 60 per hour per IP
- Clear disclaimer at bottom: "Responses are generated from curated professional context. For the latest, reach out directly."

### 4.5 Resume Page ( /resume )

- Structured HTML version of resume (scannable)
- PDF download button
- Link back to /ask for deeper questions

---

## 5. Recruiter Copilot — Technical Spec

### 5.1 Architecture

```
User message
    │
    ▼
┌─────────────────┐
│  /api/chat       │  (Astro server endpoint)
│  - Rate limit    │
│  - Sanitize input│
│  - Build prompt  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│  Ollama API      │────▶│ Llama 3.2 3B     │
│  localhost:11434 │     │ (quantized, Q4_K)│
└────────┬────────┘     └──────────────────┘
         │
         │ (if timeout or error)
         ▼
┌─────────────────┐
│  Groq API        │  (fallback)
│  Llama 3.1 8B   │
└────────┬────────┘
         │
         ▼
   Streamed response → client
```

### 5.2 Prompt Engineering

**System prompt structure:**

```
You are Pradeep AI, a professional copilot that helps recruiters and hiring
managers understand Pradeep's background, projects, and perspective.

RULES:
- Only answer based on the provided context below
- If something isn't in the context, say "That's not in my current context,
  but you can ask Pradeep directly at [email]"
- Be sharp, warm, clear, and grounded
- Never invent facts, dates, titles, or claims
- Keep answers concise (2-4 paragraphs max unless asked for detail)
- When referencing projects, link to the project page
- Don't be salesy or use superlatives — let the work speak

CONTEXT:
{source_pack_content}

CONVERSATION:
{message_history}
```

### 5.3 Source Pack (Grounding Context)

A curated markdown file (~3000-5000 tokens) containing:

- Professional summary (from resume + LinkedIn)
- Role targets and positioning
- Top 3-5 project summaries (name, problem, solution, tech, lessons)
- Strengths and working style
- AI/agentic systems perspective
- Key facts (years of experience, industries, team sizes led)
- Contact information
- Things NOT to say (guardrails)

**This file is the single source of truth for copilot responses.** It lives in the repo as `src/data/source-pack.md` and is injected into every prompt.

### 5.4 Copilot Guardrails

- No personal life questions answered
- No salary/compensation discussion
- No opinions on specific companies
- No speculative claims about capabilities
- No comparisons to other candidates
- Clear "I don't know" when context is missing
- Max response length: ~500 tokens
- Conversation context window: last 6 messages

---

## 6. Visual Design Specification

### 6.1 Design Direction

**Hybrid of tamalsen.dev + brittanychiang.com:**
- Dark background (slate/near-black, not pure black)
- Clean, spacious typography (no visual clutter)
- Subtle code/terminal aesthetic touches (like tamalsen) but restrained
- Warm accent color for CTAs and highlights
- Generous whitespace (like brittanychiang)
- Smooth scroll, minimal animations (no heavy GSAP)

### 6.2 Color Palette

| Role | Color | Hex |
|---|---|---|
| Background (primary) | Dark slate | `#0f172a` |
| Background (cards) | Slightly lighter slate | `#1e293b` |
| Text (primary) | Off-white | `#e2e8f0` |
| Text (secondary) | Muted gray | `#94a3b8` |
| Accent (primary) | Electric blue | `#3b82f6` |
| Accent (warm) | Amber/gold | `#f59e0b` |
| Success/live indicator | Green | `#22c55e` |
| Borders | Subtle slate | `#334155` |

### 6.3 Typography

| Role | Font | Size |
|---|---|---|
| Headings | Inter (or Geist Sans) | 36-48px hero, 24-30px sections |
| Body | Inter | 16-18px |
| Code/tech tags | JetBrains Mono (or Fira Code) | 14px |
| Monospace accents | JetBrains Mono | For terminal-style touches |

### 6.4 Avatar

**Needs creation.** Options to explore:
- Illustrated avatar in a semi-realistic style (like Notion avatars but more polished)
- AI-generated stylized portrait (using a reference photo)
- Abstract geometric avatar with initials
- Pixel art or vector character

Recommendation: AI-generated stylized avatar from a reference headshot — distinctive, professional, and on-brand for an AI builder's site.

---

## 7. Build Phases & Timeline

### Phase 1: Foundation (Days 1-3)

- [ ] Set up VPS: Ubuntu, Docker, Nginx, SSL (Let's Encrypt)
- [ ] Initialize Astro project with Tailwind + React
- [ ] Set up Ollama + pull Llama 3.2 3B model
- [ ] Create Docker Compose config (Astro + Ollama + Nginx)
- [ ] Build basic layout: nav, footer, dark theme
- [ ] Deploy skeleton site to realgradientdescent.tech

### Phase 2: Portfolio Core (Days 3-6)

- [ ] Build homepage: hero, positioning blocks, featured projects, CTA
- [ ] Build project page template
- [ ] Build about page
- [ ] Build resume page
- [ ] Create responsive mobile layouts
- [ ] Populate with draft content (even placeholder)

### Phase 3: Copilot (Days 6-9)

- [ ] Build /ask page with chat UI
- [ ] Create API endpoint for chat (/api/chat)
- [ ] Implement Ollama integration with streaming
- [ ] Implement Groq fallback
- [ ] Write source pack (curated context document)
- [ ] Add suggested prompts and starter chips
- [ ] Add rate limiting and session management
- [ ] Test and tune prompt engineering

### Phase 4: Polish & Content (Days 9-12)

- [ ] Create/integrate avatar
- [ ] Write final copy for all pages
- [ ] Populate 3-5 project pages with real content
- [ ] SEO metadata (title, description, OG tags)
- [ ] Lighthouse audit and performance optimization
- [ ] Cross-browser and mobile testing
- [ ] Final copilot testing with diverse questions

### Phase 5: Launch (Days 12-14)

- [ ] DNS configuration for realgradientdescent.tech
- [ ] Final deployment
- [ ] Smoke test all pages and copilot
- [ ] LinkedIn profile update with site link
- [ ] Share link for feedback

---

## 8. Content Requirements & Gap List

### Content Pradeep needs to provide:

| Item | Status | Priority |
|---|---|---|
| Latest resume (PDF + text) | Pending (LinkedIn export) | P0 |
| LinkedIn profile text | Pending (download requested) | P0 |
| Short professional bio (3-4 sentences) | Needs writing | P0 |
| 3-5 project descriptions (see template in 4.2) | Needs writing (OpenClaw + others) | P0 |
| Project screenshots/diagrams | Needs gathering | P1 |
| Target role descriptions | Partially defined | P0 |
| Working style / leadership approach notes | Needs writing | P1 |
| AI/agentic systems perspective (2-3 paragraphs) | Needs writing | P1 |
| Contact info (email, LinkedIn URL) | Needed | P0 |
| Headshot reference photo (for avatar creation) | Has photo | P1 |
| Repo/demo links for projects | Needs gathering | P2 |
| Professional philosophy note | Needs writing | P2 |

### Content I can help create:

- Homepage copy and positioning language
- Project page narratives (given raw details)
- Source pack for copilot
- Prompt starter set
- SEO metadata
- Avatar (with AI generation tools + reference photo)

---

## 9. Deployment Architecture

### 9.1 Docker Compose Structure

```
project/
├── docker-compose.yml
├── nginx/
│   └── nginx.conf          # Reverse proxy config
├── astro-app/
│   ├── Dockerfile
│   ├── src/
│   │   ├── pages/          # Astro pages
│   │   ├── components/     # React components
│   │   ├── layouts/        # Layout templates
│   │   ├── data/
│   │   │   └── source-pack.md   # Copilot grounding doc
│   │   └── styles/         # Global CSS
│   ├── public/             # Static assets (avatar, resume PDF)
│   └── astro.config.mjs
└── ollama/
    └── (pulled model stored in Docker volume)
```

### 9.2 Nginx Config Highlights

- SSL via Let's Encrypt (certbot)
- Static file caching (1 year for assets, no-cache for HTML)
- Proxy `/api/*` to Astro server
- Gzip compression
- Security headers (CSP, HSTS, X-Frame-Options)

### 9.3 CI/CD (Simple)

For V1, keep it simple:
- Git push to main → SSH into VPS → `docker compose up --build -d`
- Can add GitHub Actions later for automated deploys

---

## 10. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Llama 3.2 3B quality too low for recruiter questions | Groq fallback with Llama 3.1 8B. Test extensively before launch. Consider upgrading VPS later. |
| Copilot invents facts | Strict system prompt guardrails + small context window. Source pack is the only allowed knowledge. |
| Content not ready in time | Launch with 2-3 strong projects rather than 5 weak ones. Placeholder "coming soon" for others. |
| VPS performance under load | Static-first Astro means most pages are just HTML. Only /ask route hits the LLM. Nginx caching handles the rest. |
| Avatar looks unprofessional | Generate multiple options, pick the best. Have a fallback (initials + gradient) ready. |
| Site feels generic despite the brief's vision | Stick to the dark+clean aesthetic, invest in copy quality, make the copilot genuinely useful — not a gimmick. |

---

## 11. Success Metrics (V1)

| Metric | Target | How to measure |
|---|---|---|
| Recruiter time on site | > 2 minutes | Simple analytics (Plausible or Umami, privacy-friendly) |
| Copilot engagement | > 30% of visitors try it | API endpoint hit rate |
| Copilot message depth | > 3 messages per session | Session tracking |
| Outbound contact rate | Track clicks on email/LinkedIn CTA | Event tracking |
| Lighthouse performance | > 90 all categories | Automated testing |
| Positive feedback from 3+ recruiters | Qualitative | Direct outreach for feedback |

---

## 12. Open Questions

1. **Project selection:** Which 3-5 projects will be featured? Pradeep to add details to shared folder.
2. **Avatar style:** Need to explore options once reference photo is provided.
3. **Domain email:** Set up pradeep@realgradientdescent.tech for the contact form?
4. **Analytics:** Plausible (privacy-friendly, self-hostable) vs. Umami vs. none for V1?
5. **Blog/writing section:** Out of scope for V1, but worth planning the route (/writing)?

---

*This spec is a living document. As content arrives and decisions are made, sections will be updated.*
