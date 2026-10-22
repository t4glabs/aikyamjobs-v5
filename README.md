# Aikyam Jobs v5 - Next.js + Strapi

A modern job board platform for public interest technology jobs, built with Next.js and Strapi CMS.

## 🚀 Tech Stack

- **Frontend**: Next.js 16.2.6 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Strapi v4.26.1 (Headless CMS)
- **Database**: SQLite (dev) / PostgreSQL (production recommended)

## 📁 Project Structure

\`\`\`
aikyamjobsv5/
├── aikyamjobs-frontend/    # Next.js frontend
├── aikyamjobs-backend/     # Strapi CMS backend
└── README.md
\`\`\`

## 🛠️ Local Development

### Prerequisites

- Node.js 20.x
- npm or yarn

### Frontend Setup

\`\`\`bash
cd aikyamjobs-frontend
npm install
cp .env.example .env.local  # Configure NEXT_PUBLIC_STRAPI_URL
npm run dev  # Runs on http://localhost:3000
\`\`\`

### Backend Setup

\`\`\`bash
cd aikyamjobs-backend
npm install
cp .env.example .env  # Configure database and JWT secrets
npm run develop  # Runs on http://localhost:1337
\`\`\`

## 🌐 Production Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed production setup instructions.

### Quick Overview

Both Strapi (port 1338) and Next.js (port 3001) run under **PM2**, not systemd
(process names `aikyamjobs-beta-backend` / `aikyamjobs-beta-frontend`). Nginx
serves the live `aikyamjobs.org` domain directly from this same deployment —
the `beta.aikyamjobs.org` nginx site referenced in DEPLOYMENT.md's original
plan no longer exists; see the note at the top of that file for the current
actual setup. Backend runs on port 1338 to avoid conflicts with the other
Ghost sites on the same VPS.

## 📦 Key Features

- ✅ Job listings with categories/tags
- ✅ Company profiles
- ✅ Blog/newsletter support
- ✅ Advanced search & filtering
- ✅ SEO optimized (meta tags, Open Graph, Twitter Cards)
- ✅ Responsive design
- ✅ Markdown support for content
- ✅ Auto-unpublish expired jobs
- ✅ Configurable site settings (logo, colors, layouts)

## 🔄 Migration from Ghost

This project includes migration scripts to import content from Ghost CMS:
- Posts → Jobs/Companies
- Tags → Categories
- Images → Strapi uploads
- HTML → Markdown conversion

## 📝 License

MIT

## 👥 Maintainer

T4G Labs
