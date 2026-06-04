# Ghost to Strapi Migration Guide

This directory contains scripts to migrate data from your Ghost blog (aikyamjobs.org) to Strapi.

## Migration Files

- `aikyamjobs_migration_export.json` - Full Ghost export with all posts, tags, and metadata
- `aikyamjobs_posts_summary.csv` - Summary of posts with types and relationships
- `aikyamjobs_tags.csv` - All tags from Ghost
- `migrate-ghost-to-strapi.js` - Processes Ghost data into Strapi-compatible format
- `import-to-strapi.js` - Imports processed data into Strapi via API
- `migration-processed.json` - Output from migrate script (ready for import)

## Data Structure

### What Gets Migrated

**Companies (41 profiles)**
- All company profile posts from Ghost
- Preserves original slugs for SEO
- Includes all metadata (title, descriptions, dates, authors)
- Social sharing images (Facebook, Twitter, WhatsApp)
- Categories/tags

**Jobs (131 descriptions)**
- All job description posts from Ghost
- Linked to their respective companies via company tags
- Preserves closing dates, publish dates, authors
- All SEO metadata preserved
- Categories/tags

**Categories (167 unique)**
- All location tags (remote, cities, states)
- Job type tags (Full Time, Part time, Fellowship, Internship, etc.)
- Sector tags (Education, Health, Climate, etc.)
- Organization tags

## Migration Steps

### Step 1: Process Ghost Data

This converts the Ghost export into Strapi-compatible format:

```bash
node scripts/migrate-ghost-to-strapi.js
```

This will:
- Extract 41 companies and 131 jobs
- Parse all relationships (jobs ↔ companies)
- Extract 167 unique categories
- Create `migration-processed.json` file

### Step 2: Import to Strapi

#### Option A: Via API (Recommended for bulk import)

1. Go to Strapi admin: http://localhost:1337/admin/settings/api-tokens

2. Create a new API token:
   - Click "Create new API Token"
   - Name: "Migration Import"
   - Token duration: "Unlimited"
   - Token type: "Full access"
   - Click "Save"
   - Copy the token (you'll only see it once!)

3. Run the import script:
```bash
STRAPI_API_TOKEN=your_token_here node scripts/import-to-strapi.js
```

The script will:
- Create all categories first
- Create all companies (with proper slugs)
- Create all jobs linked to their companies
- Skip duplicates if you run it multiple times
- Show progress and summary

#### Option B: Manual Import (Good for reviewing data first)

1. Open `migration-processed.json` in a text editor

2. Review the data structure:
   - `companies` array - all company profiles
   - `jobs` array - all job descriptions
   - `categories` array - all unique categories

3. Import via Strapi admin UI:
   - Go to Content Manager
   - Create entries manually by copy-pasting data
   - Useful for spot-checking before bulk import

## Schema Updates

The migration scripts updated both Job and Company schemas to include all Ghost fields:

### Job Schema Additions
- `closingDate` - When the job closes
- `publishDate` - Original publish date from Ghost
- `author` - Post author
- `curatedBy` - Who curated this job
- `excerpt` - Short description
- `htmlContent` - Full HTML content
- `plaintextContent` - Plain text version
- `featureImage` - Hero image
- `socialImage` - Image for social sharing (Facebook/Twitter/WhatsApp)
- `metaTitle`, `metaDescription` - SEO fields

### Company Schema Additions
- `publishDate` - Original publish date
- `author` - Post author
- `excerpt` - Short description
- `htmlContent` - Full HTML content
- `plaintextContent` - Plain text version
- `featureImage` - Company logo/hero
- `socialImage` - Image for social sharing
- `featured` - Featured company flag
- `metaTitle`, `metaDescription` - SEO fields

## SEO Preservation

✅ **All original slugs are preserved**
- Jobs: `/jobs/[original-ghost-slug]`
- Companies: `/companies/[original-ghost-slug]`

✅ **All meta fields preserved**
- Meta titles and descriptions
- Social sharing images (used for Facebook, Twitter, WhatsApp previews)
- Canonical URLs
- Publish dates for freshness signals

## Troubleshooting

### "API token not found"
- Make sure you created the API token in Strapi admin
- Check that you copied the full token
- Tokens must have "Full access" permission

### "Category/Company already exists"
- This is normal! The script skips duplicates
- You can run the import multiple times safely

### Jobs not linking to companies
- Check that the company was created first
- Verify company slugs match in `migration-processed.json`
- Companies are created before jobs to ensure relationships work

### Schema errors
- Make sure Strapi is running
- Restart Strapi after schema changes
- Check that all new fields are in the schema

## Next Steps After Migration

1. **Enable Public Access**
   - Go to Settings → Users & Permissions → Roles → Public
   - Enable `find` and `findOne` for Job, Company, Category, Blog, Site-setting

2. **Verify Data**
   - Check a few jobs and companies in Strapi admin
   - Verify slugs match original Ghost URLs
   - Test relationships (click on a job, check if company is linked)

3. **Test Frontend**
   - Visit http://localhost:3000/jobs
   - Click on a job to see the detail page
   - Verify company links work

4. **SEO Check**
   - Test a few URLs from Ghost in your new site
   - Verify meta descriptions show up
   - Check social sharing previews

## Data Summary

```
Total Posts: 172
├── Company Profiles: 41
└── Job Descriptions: 131

Total Categories: 167
├── Company Tags
├── Location Tags (Remote, cities, states)
├── Job Type Tags (Full Time, Internship, etc.)
└── Sector Tags (Education, Health, etc.)

Relationships:
- Each job links to its company via company_tag_slug
- Jobs and companies both link to categories
- All original Ghost slugs preserved for SEO
```

## Notes

- The migration preserves ALL data from Ghost
- Closing dates are preserved for jobs
- Author/curator information is kept
- All HTML content is stored (can be rendered as-is)
- Social sharing images prioritize: OG image → Twitter image → Feature image
- Meta fields combine: meta_title || og_title || twitter_title || title (falls back gracefully)
