# Aikyam Jobs - Public Interest Technology Job Board

A modern job board platform built with Next.js and Strapi CMS, designed to connect talent with public interest technology opportunities.

## 🚀 Features

### For Job Seekers
- **Browse Jobs** - Search and filter through public interest technology jobs
- **Advanced Search** - Filter by location, job type, skills, and impact area
- **Company Profiles** - Learn about organizations making an impact
- **Email Alerts** - Subscribe to get notified about new opportunities
- **Mobile Responsive** - Works seamlessly on all devices

### For Administrators
- **Easy Content Management** - Intuitive Strapi CMS interface
- **Job Management** - Add, edit, and publish jobs effortlessly
- **Company Management** - Manage company profiles and information
- **Category System** - Organize jobs by categories
- **Subscriber Management** - Track and manage email subscribers
- **No Technical Skills Required** - User-friendly admin panel

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Server Components** - Optimal performance

### Backend
- **Strapi 4** - Headless CMS
- **SQLite** - Development database (can use PostgreSQL in production)
- **REST API** - Standard API endpoints

### Infrastructure
- **PM2** - Process management
- **Nginx** - Reverse proxy
- **PostgreSQL** - Production database (recommended)
- **Ubuntu VPS** - Self-hosted deployment

## 📋 Prerequisites

- Node.js 20 or higher (Note: Your system has Node 18, consider upgrading)
- npm or yarn
- PostgreSQL (for production)

## 🏃 Quick Start

### 1. Clone the Repository

```bash
cd aikyamjobsv5
```

### 2. Setup Backend (Strapi)

```bash
cd aikyamjobs-backend
npm install
npm run develop
```

The Strapi admin panel will be available at `http://localhost:1337/admin`

**First-time setup:**
1. Create your admin account
2. Go to Settings > Roles > Public
3. Enable these permissions:
   - **Job**: find, findOne
   - **Company**: find, findOne
   - **Category**: find, findOne
   - **Subscriber**: create
4. Click Save

### 3. Setup Frontend (Next.js)

Open a new terminal:

```bash
cd aikyamjobs-frontend
npm install

# Copy environment file
cp .env.local.example .env.local

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 📚 Project Structure

```
aikyamjobsv5/
├── aikyamjobs-backend/          # Strapi CMS
│   ├── config/                  # Configuration files
│   ├── src/
│   │   ├── api/                # API endpoints
│   │   │   ├── job/           # Job content type
│   │   │   ├── company/       # Company content type
│   │   │   ├── category/      # Category content type
│   │   │   └── subscriber/    # Subscriber content type
│   │   └── index.js
│   ├── .env                    # Environment variables
│   └── package.json
│
├── aikyamjobs-frontend/        # Next.js application
│   ├── app/                    # App router pages
│   │   ├── page.tsx           # Home page
│   │   ├── jobs/              # Jobs pages
│   │   ├── companies/         # Companies pages
│   │   └── subscribe/         # Subscribe page
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   │   ├── api.ts            # API client
│   │   └── types.ts          # TypeScript types
│   └── package.json
│
├── DEPLOYMENT.md              # Deployment guide
└── README.md                  # This file
```

## 🎨 Content Types

### Job
- Title, slug, description
- Location, job type, experience level
- Skills (array)
- Impact area
- Application URL/Email
- Deadline
- Featured flag
- Relations: Company (many-to-one), Categories (many-to-many)

### Company
- Name, slug, description
- Logo, website
- Location, size, industry
- Relations: Jobs (one-to-many)

### Category
- Name, slug, description
- Relations: Jobs (many-to-many)

### Subscriber
- Email, name
- Skills, locations, impact areas (for personalized alerts)
- Active status

## 🔧 Configuration

### Backend Environment Variables

Create `aikyamjobs-backend/.env`:

```env
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys
API_TOKEN_SALT=your-salt
ADMIN_JWT_SECRET=your-secret
JWT_SECRET=your-jwt-secret
```

### Frontend Environment Variables

Create `aikyamjobs-frontend/.env.local`:

```env
NEXT_PUBLIC_STRAPI_URL=http://localhost:1337
```

For production, change to your production Strapi URL.

## 📱 Usage

### Adding Your First Job

1. Go to `http://localhost:1337/admin`
2. Click "Content Manager" > "Company" > "Create new entry"
3. Add a company (name, description, etc.)
4. Click "Content Manager" > "Category" > "Create new entry"
5. Add categories (e.g., "Engineering", "Design", "Product")
6. Click "Content Manager" > "Job" > "Create new entry"
7. Fill in job details, select company and categories
8. Click "Publish"
9. Visit `http://localhost:3000` to see your job!

### Managing Content

All content is managed through the Strapi admin panel at `/admin`. The interface is intuitive and requires no technical knowledge:

- **Jobs** - Add, edit, publish, or unpublish jobs
- **Companies** - Manage company profiles
- **Categories** - Create and organize job categories
- **Subscribers** - View email subscribers

## 🚀 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for Ubuntu VPS.

**Quick deployment checklist:**
1. Setup Ubuntu VPS with Node.js 20+
2. Install PostgreSQL
3. Install Nginx
4. Clone your repository
5. Configure environment variables
6. Build and start with PM2
7. Configure Nginx reverse proxy
8. Setup SSL with Let's Encrypt

## 🔐 Security

- All secrets should be changed from defaults
- Use PostgreSQL in production (not SQLite)
- Enable SSL/HTTPS
- Configure CORS properly
- Regular backups of database
- Keep dependencies updated

## 🐛 Troubleshooting

### Node Version Issues
The latest Next.js and Strapi require Node.js 20+. If you encounter errors:

```bash
# Check your Node version
node --version

# If less than 20, upgrade Node.js
# Using nvm (recommended)
nvm install 20
nvm use 20

# Or download from nodejs.org
```

### Backend Won't Start
```bash
cd aikyamjobs-backend
rm -rf node_modules package-lock.json
npm install
npm run develop
```

### Frontend Build Errors
```bash
cd aikyamjobs-frontend
rm -rf .next node_modules package-lock.json
npm install
npm run dev
```

### Database Connection Issues
Check your `.env` file has correct database credentials and PostgreSQL is running:
```bash
sudo systemctl status postgresql
```

## 📄 API Documentation

The Strapi API follows REST conventions:

- `GET /api/jobs` - List all jobs
- `GET /api/jobs/:id` - Get single job
- `GET /api/companies` - List all companies
- `GET /api/companies/:id` - Get single company
- `GET /api/categories` - List all categories
- `POST /api/subscribers` - Create subscriber

Add `?populate=*` to include relations.

## 🤝 Contributing

This is a private project for Aikyam Jobs. For questions or issues, contact the development team.

## 📝 License

Proprietary - Aikyam Jobs

## 🙏 Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Strapi](https://strapi.io/)
- [Tailwind CSS](https://tailwindcss.com/)
- Inspired by [Bharat Digital Jobs](https://jobs.bharatdigital.io/)

---

**Need Help?**
- Check the [Deployment Guide](./DEPLOYMENT.md)
- Review Strapi documentation: https://docs.strapi.io
- Review Next.js documentation: https://nextjs.org/docs
