# Ghost to Strapi Migration Guide

## Overview

This guide walks you through migrating your job posts from Ghost (aikyamjobs.org) to the new Strapi-powered platform.

## What Gets Imported

- ✅ Job titles and slugs (preserved exactly)
- ✅ Job descriptions (converted from HTML to Markdown)
- ✅ Companies (auto-created from tags)
- ✅ Categories (extracted from skill/role tags)
- ✅ Location, job type, experience level
- ✅ Salary information (extracted from titles)
- ✅ Application deadlines (from `#closes-YYYY-MM-DD` tags)
- ✅ Featured status
- ✅ Published dates
- ✅ SEO metadata (from excerpts)

## Tag Mapping Logic

The import script intelligently extracts data from Ghost tags:

### Company Names
- First non-system tag becomes the company name
- Creates company if doesn't exist
- Example: `WWF India`, `Teach For India`

### Locations
- Tags containing: `delhi`, `mumbai`, `bangalore`, `hyderabad`, `chennai`, `kolkata`, `pune`, `kerala`, `remote`, `india`
- Example: `Remote`, `Bangalore`, `Kerala`

### Job Types
- Tags: `full-time`, `part-time`, `contract`, `freelance`, `internship`, `fellowship`
- Defaults to `full-time` if not specified

### Experience Levels
- Tags: `fresher`, `entry`, `junior`, `mid`, `senior`, `lead`
- Maps to: `entry`, `junior`, `mid`, `senior`

### Categories/Skills
- Tags: `project-management`, `fundraising`, `communications`, `monitoring&evaluation`, `administration`, `data`, `digital-marketing`, `partnerships`, `accounting`, `leadership`, `design`, `research`, `policy`, `advocacy`, `technology`

### Deadlines
- Tags like `#closes-2026-05-23` automatically extract deadline date
- Format: `#closes-YYYY-MM-DD`

### Salary
- Extracted from job title if present
- Example: "Job Title | Company | ₹1.80-2.40 LPA"

## Pre-Import Steps

### 1. Prepare Ghost Export

The script uses a filtered export with 50 recent posts:

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-frontend
# File already created: ghost-recent-50.json
```

If you want to import ALL posts instead:

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend/scripts
# Replace ghost-recent-50.json with full export
cp /path/to/aikyam-jobs.ghost.2026-05-14-11-57-49.json ./ghost-full-export.json
```

Then update line 110 in `import-ghost.js`:
```javascript
const ghostData = JSON.parse(fs.readFileSync('./scripts/ghost-full-export.json', 'utf8'));
```

### 2. Install Dependencies

The script uses `jsdom` for HTML parsing (optional):

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
npm install jsdom
```

## Running the Import

### 1. Make sure Strapi is running

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
npm run develop
```

### 2. In a new terminal, run the import script

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
node scripts/import-ghost.js
```

### Expected Output

```
🚀 Starting Ghost to Strapi import...

📦 Found 50 posts to import

✅ Imported: Space Coordinator in Kochi | Local Sustainable Living | ₹1.80-2.40 LPA
  ✨ Created company: Local Sustainable Living
✅ Imported: Communications Lead | Samhita | ₹4-6 LPA
  ✨ Created company: Samhita
⏭️  Skipping: Senior Developer (already exists)
...

📊 Import Summary:
   ✅ Imported: 47
   ⏭️  Skipped: 3
   ❌ Errors: 0
   📦 Total: 50

🏁 Import complete!
```

## Legacy URL Redirects

The platform automatically handles old Ghost URLs:

### How it Works

1. User visits: `aikyamjobs.org/communications-lead-samhita`
2. Catch-all route (`app/[slug]/page.tsx`) checks if job exists
3. If found: Redirects to `/jobs/communications-lead-samhita` (301 permanent)
4. If not found: Shows 404

### Protected Routes

These routes will NOT be redirected:
- `/jobs/*` - Job listing and detail pages
- `/companies/*` - Company pages
- `/api/*` - API routes
- `/_next/*` - Next.js internals
- Static files: `favicon.ico`, `robots.txt`, `sitemap.xml`

## Post-Import Verification

### 1. Check Strapi Admin

```
http://localhost:1337/admin
```

- Go to **Content Manager** → **Job**
- Verify imported jobs
- Check companies are created
- Verify categories exist

### 2. Check Frontend

```
http://localhost:3000/jobs
```

- Browse imported jobs
- Click on job details
- Verify formatting is correct
- Test legacy URL: `http://localhost:3000/your-job-slug` (should redirect)

### 3. Verify Data Quality

Run this check script:

```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
node -e "
const strapi = require('@strapi/strapi');
(async () => {
  const app = await strapi().load();
  const jobs = await strapi.db.query('api::job.job').findMany();
  const companies = await strapi.db.query('api::company.company').findMany();
  const categories = await strapi.db.query('api::category.category').findMany();

  console.log('📊 Import Statistics:');
  console.log('  Jobs:', jobs.length);
  console.log('  Companies:', companies.length);
  console.log('  Categories:', categories.length);
  console.log('\\n✅ Top 5 Jobs:');
  jobs.slice(0, 5).forEach(j => console.log('  -', j.title));

  await app.destroy();
})();
"
```

## Troubleshooting

### Import Script Errors

**Error: Cannot find module '@strapi/strapi'**
```bash
cd /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend
npm install
```

**Error: ENOENT: no such file or directory 'ghost-recent-50.json'**
```bash
# Make sure the file is in scripts/ folder
ls scripts/ghost-recent-50.json
```

**Error: Strapi is not running**
```bash
# Start Strapi first
npm run develop
```

### Data Quality Issues

**Job descriptions look broken:**
- Check if HTML to Markdown conversion worked
- Manually edit problematic jobs in Strapi admin
- Consider improving `htmlToMarkdown()` function

**Missing companies:**
- Tags might not be in expected format
- Manually create companies in Strapi
- Update jobs to link to companies

**Wrong categories:**
- Update `skillTags` array in import script
- Re-run import (will skip existing jobs)
- Or manually edit in Strapi admin

**Deadlines not imported:**
- Check if Ghost tags use `#closes-YYYY-MM-DD` format
- Update manually in Strapi admin

### Legacy URL Redirects Not Working

**Redirect loops:**
- Check if catch-all route conflicts with existing routes
- Verify `app/[slug]/page.tsx` is correct

**404 instead of redirect:**
- Job might not be imported yet
- Check slug matches exactly (case-sensitive)
- Verify job is published in Strapi

## Re-running the Import

The script is **idempotent** - it won't duplicate jobs:

```bash
node scripts/import-ghost.js
# Will skip jobs that already exist (by slug)
# Will only import new/missing jobs
```

To reimport everything:

```bash
# Delete all jobs, companies, categories from Strapi admin first
# Then run import again
node scripts/import-ghost.js
```

## Customizing the Import

### Change What Gets Imported

Edit `/aikyamjobs-backend/scripts/import-ghost.js`:

```javascript
// Line 110: Change number of posts
const posts = ghostData.db[0].data.posts.slice(0, 100); // Import 100 instead of 50

// Line 165: Add more locations
const locations = ['delhi', 'mumbai', 'goa', 'jaipur']; // Add custom locations

// Line 180: Add more skills
const skillTags = ['project-management', 'your-custom-tag'];
```

### Improve HTML to Markdown

The `htmlToMarkdown()` function (line 14-51) converts HTML to Markdown. Enhance it for better formatting:

```javascript
// Add code block support
.replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')

// Add blockquote support
.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gi, '> $1\n')
```

## Production Deployment

### Before Going Live

1. ✅ Import all Ghost posts
2. ✅ Verify data quality in Strapi
3. ✅ Test legacy URL redirects
4. ✅ Check SEO metadata
5. ✅ Test job applications (URLs, emails)
6. ✅ Backup Strapi database

### DNS & Domain Setup

When moving to production:

1. Point `aikyamjobs.org` to new server
2. Legacy URLs will automatically redirect via catch-all route
3. Update env variables:
   ```
   NEXT_PUBLIC_SITE_URL=https://aikyamjobs.org
   NEXT_PUBLIC_API_URL=https://aikyamjobs.org/api
   ```

### SEO Preservation

- Slugs are preserved exactly
- 301 redirects maintain SEO juice
- Metadata imported from Ghost excerpts
- Sitemap automatically updates

## Support

If you encounter issues:

1. Check Strapi logs: `/aikyamjobs-backend/logs`
2. Check Next.js logs in terminal
3. Verify database in Strapi admin
4. Test API directly: `http://localhost:1337/api/jobs?populate=*`

---

**Migration created:** May 2026
**Ghost version:** 6.32.0
**Strapi version:** 4.25.14
**Next.js version:** 16.2.6
