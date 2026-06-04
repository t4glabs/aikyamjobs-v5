# Implementation Guide - Blog Feature & Grid Layouts

## Overview

This guide explains the new features added to your Aikyam Jobs website:

1. **Blog Feature** - Add newsletters, blog posts, case studies, stories, and guides
2. **Grid Layout System** - Display jobs, companies, and blogs in a modern grid layout
3. **Site Settings** - Customize homepage layout and content from Strapi admin

## What's Been Added

### Backend (Strapi)

#### 1. Blog Content Type
Location: `aikyamjobs-backend/src/api/blog/`

**Fields:**
- `title` - Blog post title
- `slug` - URL-friendly slug (auto-generated from title)
- `excerpt` - Short description
- `content` - Full blog content (rich text)
- `featuredImage` - Cover image
- `author` - Author name
- `publishDate` - Publication date
- `featured` - Mark as featured
- `tags` - Array of tags
- `readTime` - Estimated reading time in minutes
- `category` - One of: newsletter, blog, case-study, story, guide
- `externalLink` - Optional external URL (for linking to Ghost blog posts)
- `seo` - SEO metadata

#### 2. Site Settings (Singleton)
Location: `aikyamjobs-backend/src/api/site-setting/`

**Configuration Options:**
- **Hero Section:**
  - `heroTitle` - Main headline
  - `heroSubtitle` - Subtitle text

- **Jobs Section:**
  - `jobsSectionTitle` - Section heading
  - `jobsLayoutType` - "grid" or "list"
  - `jobsGridColumns` - 1-4 columns
  - `showJobsOnHomepage` - Show/hide on homepage
  - `homepageJobsLimit` - Number of jobs to show

- **Companies Section:**
  - `companiesSectionTitle`
  - `companiesLayoutType`
  - `companiesGridColumns`
  - `showCompaniesOnHomepage`
  - `homepageCompaniesLimit`

- **Blogs Section:**
  - `blogsSectionTitle`
  - `blogsLayoutType`
  - `blogsGridColumns`
  - `showBlogsOnHomepage`
  - `homepageBlogsLimit`

- **Branding:**
  - `siteName`
  - `siteDescription`
  - `primaryColor`
  - `logo`
  - `socialLinks`
  - `contactEmail`

### Frontend (Next.js)

#### New Pages:
1. `/blogs` - Blog listing page with grid layout
2. `/blogs/[slug]` - Individual blog post page

#### Updated Pages:
1. `/` (Homepage) - Now displays blogs and uses site settings
2. `/jobs` - Converted to grid layout (3 columns on desktop)
3. Navigation - Added "Blog" link

#### New API Functions:
- `getBlogs()` - Fetch blog posts
- `getBlog(slug)` - Fetch single blog post
- `getSiteSettings()` - Fetch site configuration

## Getting Started

### Step 1: Start Strapi Backend

```bash
cd aikyamjobs-backend
npm run develop
```

Strapi admin will be available at `http://localhost:1337/admin`

### Step 2: Configure Content Types in Strapi

1. **Go to Settings > Users & Permissions > Roles**
   - Select "Public" role
   - Under "Blog", enable: `find` and `findOne`
   - Under "Site-setting", enable: `find`
   - Click Save

2. **Create Site Settings:**
   - Go to Content Manager > Single Types > Site Settings
   - Configure your homepage settings
   - Save & Publish

### Step 3: Add Blog Content

**Option A: Add New Blog Posts**
1. Go to Content Manager > Blog
2. Click "Create new entry"
3. Fill in the fields:
   - Title
   - Excerpt
   - Content (use markdown format)
   - Category (newsletter/blog/case-study/story/guide)
   - Featured image (optional)
   - Author, tags, read time
4. Save & Publish

**Option B: Link to Existing Ghost Blog Posts**
1. Create a new Blog entry
2. Fill in basic info (title, excerpt, author, date)
3. In the "External Link" field, add the full URL to your Ghost blog post
4. When users click this blog card, it will open the Ghost post in a new tab

### Step 4: Start Frontend

```bash
cd aikyamjobs-frontend
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Customization Options

### Grid Layouts

The grid system is responsive:
- **Mobile:** 1 column
- **Tablet:** 2 columns
- **Desktop:** 3 columns (default, configurable to 1-4)

You can customize this from Strapi:
1. Go to Site Settings
2. Change `jobsGridColumns` or `blogsGridColumns`
3. Set to 1 for full-width list layout
4. Set to 2-4 for grid layouts

### Section Visibility

Hide/show sections on homepage:
- `showJobsOnHomepage`
- `showCompaniesOnHomepage`
- `showBlogsOnHomepage`

### Section Titles

Customize all section headings:
- `jobsSectionTitle` (default: "Latest Opportunities")
- `companiesSectionTitle` (default: "Featured Companies")
- `blogsSectionTitle` (default: "Latest from our Blog")

## Migration from Ghost Blog

If you have existing blog posts on Ghost (like aikyamjobs.org), you have two options:

**Option 1: Link to Ghost Posts**
- Create Blog entries with external links
- Keeps your content on Ghost
- Quick setup

**Option 2: Import Content**
- Export from Ghost (Settings > Labs > Export)
- Create Blog entries in Strapi
- Copy content from Ghost to Strapi
- Host everything on Strapi

## Features

### Blog Features
- ✅ Grid layout with featured images
- ✅ Categories (newsletter, blog, case study, story, guide)
- ✅ Search and filter by category
- ✅ Featured blog posts
- ✅ Author attribution
- ✅ Read time estimates
- ✅ Tags support
- ✅ External link support (for Ghost posts)
- ✅ Markdown content rendering
- ✅ SEO optimization
- ✅ Pagination

### Grid Layout Features
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Configurable columns (1-4)
- ✅ Hover effects
- ✅ Card-based design
- ✅ Consistent spacing
- ✅ Similar to aikyamjobs.org design

### Site Settings Features
- ✅ Homepage customization
- ✅ Section visibility controls
- ✅ Layout type selection (grid/list)
- ✅ Content limits
- ✅ Hero section customization
- ✅ Branding options

## Next Steps

1. **Configure Strapi Permissions** (see Step 2 above)
2. **Create Site Settings** to customize your homepage
3. **Add Blog Content** - Start with a few test posts
4. **Customize Colors** - Update primary color in Site Settings
5. **Add Your Logo** - Upload in Site Settings
6. **Test Responsive Design** - Check on mobile/tablet/desktop

## Production Deployment

Before deploying:

1. Update environment variables:
   - `NEXT_PUBLIC_STRAPI_URL` - Your Strapi production URL
   - `NEXT_PUBLIC_SITE_URL` - Your website URL

2. Build and test:
   ```bash
   cd aikyamjobs-frontend
   npm run build
   ```

3. Deploy Strapi backend first
4. Then deploy Next.js frontend

## Support

For any issues or questions, refer to:
- [Strapi Documentation](https://docs.strapi.io)
- [Next.js Documentation](https://nextjs.org/docs)

---

**Summary:** Your website now has a complete blog feature with grid layouts for all content types, and you can customize everything from the Strapi admin panel without touching code!
