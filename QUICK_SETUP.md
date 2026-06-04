# Quick Setup Guide

## Current Status

✅ Backend running at `http://localhost:1337`
✅ Frontend code ready
⚠️ Permissions need to be configured (2 minutes)

## Step 1: Configure Strapi Permissions

**This is required for the blog feature to work!**

1. Open Strapi Admin: `http://localhost:1337/admin`

2. Go to **Settings** (bottom left) → **Users & Permissions** → **Roles**

3. Click on **Public** role

4. Scroll down and find these sections:

   **Blog:**
   - ☑️ Check `find`
   - ☑️ Check `findOne`

   **Site-setting:**
   - ☑️ Check `find`

5. Click **Save** (top right)

## Step 2: Test the Website

The homepage and blog page should now work!

- Homepage: `http://localhost:3000`
- Jobs: `http://localhost:3000/jobs` (already working)
- Companies: `http://localhost:3000/companies` (already working)
- Blogs: `http://localhost:3000/blogs` (now works after permissions)

## Step 3: (Optional) Customize Site Settings

1. In Strapi admin, go to **Content Manager** → **Single Types** → **Site Settings**

2. Click **+ Create new entry** (if not created)

3. Customize:
   - Hero title and subtitle
   - Section titles
   - Grid columns (1-4)
   - Show/hide sections
   - Content limits

4. Click **Save** then **Publish**

## Step 4: (Optional) Add Blog Content

### Option A: Link to existing Ghost posts

1. Go to **Content Manager** → **Blog**
2. Click **+ Create new entry**
3. Fill in:
   - **Title**: Your blog post title
   - **Excerpt**: Short description
   - **Category**: Choose newsletter, blog, case-study, story, or guide
   - **Author**: Author name
   - **External Link**: Full URL to your Ghost blog post (e.g., https://aikyamjobs.org/your-post)
   - **Publish Date**: Select date
4. Click **Save** then **Publish**

### Option B: Create new blog posts

1. Same as above but fill in the **Content** field with markdown
2. Upload a **Featured Image**
3. Add **Tags** and **Read Time**
4. Leave **External Link** empty

## Troubleshooting

### Blog page shows "not configured"
- Make sure you completed Step 1 (permissions)
- Restart the frontend if needed

### Homepage doesn't show blogs
- Add some blog posts in Strapi
- Or disable blogs: Site Settings → `showBlogsOnHomepage = false`

### Backend errors
- Make sure you're using Node 20: `nvm use 20`
- Run: `npm rebuild better-sqlite3`

## Visual Guide for Permissions

```
Strapi Admin (http://localhost:1337/admin)
  └─ Settings (⚙️ icon, bottom left)
      └─ Users & Permissions
          └─ Roles
              └─ Public (click to edit)
                  └─ Permissions section (scroll down)
                      ├─ Blog
                      │   ├─ ☑️ find
                      │   └─ ☑️ findOne
                      └─ Site-setting
                          └─ ☑️ find
                  └─ [Save] button (top right)
```

## That's It!

Once permissions are configured, everything will work perfectly. The website will gracefully handle missing blog content and show helpful messages.

---

**Need help?** Check `FEATURES_SUMMARY.md` and `IMPLEMENTATION_GUIDE.md` for detailed information.
