# aikyamjobs — Claude Code Context

## Memory bootstrap (run this on every new machine / first session)

When starting a session on a machine that hasn't worked on this project before, check whether the local memory files exist and create them if not. This ensures every team member's Claude Code has the same project context without it being stored in the repo.

Run this check at the start of the first session:

```
Check if ~/.claude/projects/.../memory/project_overview.md exists.
If it does not exist, create the following memory files:
```

**`project_overview.md`** — type: project
```
aikyamjobs is a curated job board for the social impact sector in India.
It connects people seeking social impact careers with NGOs, nonprofits, and
movements looking for mission-aligned people. Jobs are manually curated by the
team — sourced from LinkedIn, JD lists, and directly from connected orgs.
The team shares analytics reports back to those orgs to encourage ongoing posting.

Team: Jinso (tech lead), Founder (non-technical, product decisions), Greeshma (manages job listings via Strapi admin).

Do not suggest automated job scraping — curation is intentional.
Do not expose internalTags on the frontend.
Read CLAUDE.md at the repo root for full technical detail.
```

**`project_infra.md`** — type: project
```
Next.js (port 3001) + Strapi 5.59.0 (port 1338) on Hetzner VPS.
Nginx proxies aikyamjobs.org — /api, /uploads, /admin → Strapi; rest → Next.js.
DNS via Cloudflare. Process manager: PM2.
Deployment: Jinso pulls on VPS manually via Termius SSH:
  git pull → pm2 restart backend → npm run build → pm2 restart frontend
NEXT_PUBLIC_* vars baked at build time — changes require full rebuild.
STRAPI_INTERNAL_URL is runtime-only (no prefix) — restart only.
```

**`feedback_node22.md`** — type: feedback
```
Always run `nvm use 22` before any npm or node commands in this project.
Why: Strapi 5.59.0 (since the Oct 2026 migration) requires Node 22+ to boot
at all; Node 20 is also EOL. Prepend to all npm/node commands.
```

## What this project is

aikyamjobs is a curated job board for the social impact sector in India. It exists to connect two groups:
- People who want to work in social impact (NGOs, movements, nonprofits, public interest orgs)
- Social impact organisations that want to find passionate people aligned with their mission

It is **not** a generic job board. Every job listed here is from the nonprofit / social impact world. Jobs are manually curated by the team — sourced from public listings (LinkedIn etc.), JD lists, and directly from connected organisations. Some organisations share job openings with aikyamjobs directly; in return the team shares analytics reports (job views, interactions, newsletter clicks) with them to encourage ongoing engagement.

## Team

- **Jinso** — tech lead, manages all code, infra, deployments, Claude Code sessions
- **Founder** — non-technical, drives product decisions, ideas, and strategy
- **Greeshma** — manages job listings day-to-day: adding, publishing, editing, and removing jobs via Strapi admin

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js (App Router, server components) |
| Backend / CMS | Strapi (headless CMS) |
| Database | SQLite (Strapi default) |
| Email / Newsletter | Listmonk |
| Hosting | Hetzner VPS |
| DNS / CDN | Cloudflare |
| Process manager | PM2 |
| Reverse proxy | Nginx |
| Version control | GitHub (`t4glabs/aikyamjobs-v5`) |

## Infrastructure

- Strapi runs on port **1338**, Next.js on port **3001**
- Nginx proxies `aikyamjobs.org` — `/api`, `/uploads`, `/admin` → Strapi; everything else → Next.js
- Frontend env vars: `NEXT_PUBLIC_STRAPI_URL`, `NEXT_PUBLIC_SITE_URL`, `STRAPI_INTERNAL_URL` (runtime-only, for server-side fetches)
- `NEXT_PUBLIC_*` vars are baked at build time — changing them requires a full `npm run build`

## Deployment workflow

1. Jinso and Claude Code work locally and push to GitHub (`main` branch)
2. Jinso SSHs into the Hetzner VPS via Termius
3. On the VPS: `git pull` → `pm2 restart` backend → `npm run build` → `pm2 restart` frontend
4. There is no automated CI/CD — all VPS deploys are manual by Jinso

## Frontend structure (Next.js)

- `app/page.tsx` — homepage (hero, browse by tag, job listings, blog section)
- `app/jobs/page.tsx` — job listing page with filters and pagination
- `app/jobs/[slug]/page.tsx` — individual job detail page with sidebar
- `app/companies/page.tsx` — company listing
- `app/companies/[slug]/page.tsx` — company profile page
- `app/blogs/page.tsx` — blog/resource listing
- `app/blogs/[slug]/page.tsx` — blog post page
- `app/tag/[slug]/page.tsx` — jobs filtered by category tag
- `app/subscribe/page.tsx` — Listmonk subscription form
- `components/Navbar.tsx` — server component, fetches settings, passes to NavbarClient
- `components/NavbarClient.tsx` — client component, handles mobile hamburger toggle
- `components/Footer.tsx` — server component, all links Strapi-configurable
- `lib/api.ts` — all Strapi API calls
- `lib/types.ts` — TypeScript types for all Strapi content types

## Backend structure (Strapi)

Key content types:
- **Job** — core content type; has title, slug, description (markdown), excerpt, jobType, location, experienceLevel, salary, closingDate, applicationUrl, applicationEmail, featured, skills (JSON array), impactArea, categories (M2M), company (relation), curatedBy (relation), internalTags (M2M)
- **Company** — name, slug, logo, excerpt, description, location, industry, website, jobs (relation)
- **Category** — name, slug; used as public-facing tags on jobs
- **Internal Tag** — name, color; editorial labels, never shown on frontend (e.g. `expired-job`)
- **Site Setting** — single type; controls homepage layout, nav links, footer links, colors, section visibility, limits, blog layout type (grid/list/line)
- **Blog** — title, slug, content, excerpt, author, category, featured, externalLink
- **Subscriber** — legacy, replaced by Listmonk (no longer used from frontend)

## Key behaviours

**Site settings** drive almost everything on the homepage and navbar:
- `navLinks`, `footerResourceLinks`, `footerSeekerLinks` — all configurable JSON arrays
- `homepageJobsLimit`, `homepageBlogsLimit` — control how many cards appear
- `jobsLayoutType`, `blogsLayoutType` (`grid` / `list` / `line`) — control card vs list view
- `primaryColor` — brand color applied site-wide via CSS variable

**Cron job** (`config/cron-tasks.js`) runs daily at midnight:
- Finds published jobs where `closingDate` is in the past
- Adds the `expired-job` internal tag (looked up by exact name `expired-job`)
- Sets `publishedAt: null` to move job to draft
- Tag and unpublish are done as two separate Document Service calls to avoid conflicts

**Stretched-link pattern** on job cards (both homepage and `/jobs`):
- Card wrapper is a `<div className="relative">`, not a `<Link>`
- An invisible `<Link className="absolute inset-0 z-0">` covers the whole card
- Individual tags (jobType, location, category, skills) use `relative z-10` so they intercept clicks and link to filtered listings

**Listmonk** handles all email subscriptions. The subscribe form POSTs directly to `https://mails.tinybridge.org/subscription/form`. There is no unsubscribe page — users unsubscribe from the email itself (listmonk requires email verification for unsubscription).

## What NOT to do

- Do not add automated job scraping or import scripts — job curation is intentionally manual
- Do not expose `internalTags` on the frontend — they are editorial-only
- Do not push to GitHub without Jinso's approval — always stage changes locally first
- Do not use `git push --force` or amend published commits
- Always run `nvm use 22` before any `npm` or `node` commands (Strapi 5.59.0 requires Node 22+)
- `NEXT_PUBLIC_*` env var changes require a full rebuild on the VPS, not just a restart
