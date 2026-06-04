# Ghost Assets and Images - Migration Guide

## The Issue

When you see `__GHOST_URL__` in content or images don't load, it's because:

1. **Ghost uses relative URLs** - Images stored as `__GHOST_URL__/content/images/...`
2. **Assets are on Ghost server** - When Ghost is disabled, images break
3. **Need to download and host locally** - Or keep links to https://aikyamjobs.org

## Two Solutions

### Option 1: Keep Ghost Assets Online (Quick Fix) ✅

**Pros:**
- ✅ No download needed
- ✅ Images work immediately
- ✅ No storage issues

**Cons:**
- ❌ Dependent on Ghost server
- ❌ If Ghost goes down, images break

**How it works:**
The conversion script now replaces `__GHOST_URL__` with `https://aikyamjobs.org`, so:
- `__GHOST_URL__/content/images/pic.jpg` → `https://aikyamjobs.org/content/images/pic.jpg`

Just re-run the conversion:
```bash
STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js
```

### Option 2: Download Assets to Strapi (Complete Migration) 🎯

**Pros:**
- ✅ Complete independence from Ghost
- ✅ Faster loading (same server)
- ✅ Full control over assets

**Cons:**
- ❌ Requires download and upload
- ❌ Takes storage space
- ❌ Manual process

**Steps:**

#### 1. Export Ghost Content Folder

On your Ghost VPS:
```bash
cd /var/www/ghost
tar -czf ghost-content.tar.gz content/images/
```

Download to your machine:
```bash
scp user@your-ghost-server:/var/www/ghost/ghost-content.tar.gz ~/Desktop/aikyamjobsv5/
```

#### 2. Extract Assets
```bash
cd ~/Desktop/aikyamjobsv5
tar -xzf ghost-content.tar.gz
```

#### 3. Upload to Strapi

You have two options:

**A. Manual Upload via Strapi UI:**
1. Go to http://localhost:1337/admin/plugins/upload
2. Create folder: `ghost-images`
3. Upload all images from `content/images/`
4. Note the new Strapi URLs

**B. Programmatic Upload (I can create a script):**
- Script would:
  - Read all images from `content/images/`
  - Upload to Strapi Media Library via API
  - Build a URL mapping (old Ghost URL → new Strapi URL)
  - Update all posts to use new Strapi URLs

#### 4. Update Content URLs

If you want me to create the upload script, I can make it:
- Find all image URLs in posts
- Upload images to Strapi
- Replace URLs in content
- Update database

## Current Status

**What's Fixed:**
✅ `__GHOST_URL__` is now replaced with `https://aikyamjobs.org` in conversion script
✅ Images will load from Ghost server
✅ Company pages now use Markdown (no more weird rendering)

**What You Need to Decide:**

**Keep Ghost Assets Online?**
- Pro: Works right now, no extra work
- Con: Dependent on Ghost server

**Or Download Assets to Strapi?**
- Pro: Complete independence
- Con: Requires export/import process

## Recommendation

**For Now:** Keep assets on Ghost server (Option 1)
- Links are fixed with `https://aikyamjobs.org`
- Everything works
- No rush to migrate

**Later:** When ready to shut down Ghost (Option 2)
- Export content folder
- I'll create an upload script
- Complete migration

## Commands to Run

**Fix Current Issues (Company pages + __GHOST_URL__):**
```bash
STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js
```

This will:
1. Convert company HTML to Markdown (fixes rendering)
2. Replace `__GHOST_URL__` with `https://aikyamjobs.org` (fixes images)
3. Make all content editable in Strapi

**After this runs:**
- ✅ Company pages will render properly
- ✅ Images will load from Ghost server
- ✅ No more `__GHOST_URL__` references
- ✅ All content is clean Markdown

## If You Want to Migrate Assets

Let me know and I'll create:
1. **Asset download script** - Downloads all images from Ghost URLs
2. **Asset upload script** - Uploads to Strapi Media Library
3. **URL replacement script** - Updates all posts with new Strapi URLs

Just say "migrate assets" and I'll build the complete solution!
