# Complete Image Migration from Ghost to Strapi

## Step-by-Step Guide

### Step 1: Fix HTML in Listings (Do This First!)

The HTML text you see in job listings will be fixed by running the conversion script:

```bash
STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js
```

This will:
- ✅ Convert all HTML to clean Markdown
- ✅ Fix `__GHOST_URL__` references
- ✅ Make listings show clean text
- ✅ Fix company pages rendering

### Step 2: Upload Ghost Images Folder

Upload your Ghost `content/images` folder to the backend:

```bash
# Create the folder
mkdir -p aikyamjobs-backend/ghost-images

# Then copy/upload your Ghost images there
# Your structure should be:
# aikyamjobs-backend/
#   ├── ghost-images/
#   │   ├── 2024/
#   │   ├── 2025/
#   │   └── ... (all your Ghost image folders)
#   └── scripts/
```

**You can:**
- Upload via file manager/Finder
- Copy from USB drive
- SCP from Ghost server:
  ```bash
  scp -r user@ghost-server:/var/www/ghost/content/images/* ~/Desktop/aikyamjobsv5/aikyamjobs-backend/ghost-images/
  ```

### Step 3: Run Image Migration Script

Once images are in `ghost-images/` folder:

```bash
STRAPI_API_TOKEN=your_token node scripts/migrate-images-to-strapi.js
```

This will:
1. ✅ Find all images in `ghost-images/` folder
2. ✅ Upload each image to Strapi Media Library
3. ✅ Create a URL mapping (Ghost URL → Strapi URL)
4. ✅ Update all jobs and companies with new Strapi URLs
5. ✅ Save mapping to `image-url-mapping.json`

**Progress indicators:**
- Shows each image being uploaded
- Shows each post being updated
- Gives final summary

**Expected output:**
```
Found 245 images to upload

  ✓ Uploaded: 2024/01/company-logo.png
  ✓ Uploaded: 2024/02/team-photo.jpg
  ...

✅ Upload complete!
   Uploaded: 245
   Failed: 0

🔄 Updating posts with new image URLs...
  ✓ Updated job: Block Coordinator in Punjab
  ✓ Updated company: Bahaar Foundation
  ...

✅ Image migration completed!

Summary:
  Images uploaded:    245
  Jobs updated:       89
  Companies updated:  38
  Failed uploads:     0

🎉 All images are now hosted in Strapi!
💡 You can now safely disable Ghost server.
```

## What Gets Migrated

### Images:
- ✅ All JPG, JPEG, PNG, GIF, WEBP, SVG files
- ✅ Maintains folder structure
- ✅ Preserves filenames

### References Updated:
- ✅ Job descriptions
- ✅ Company descriptions
- ✅ Markdown image syntax `![alt](url)`
- ✅ All Ghost URLs replaced with Strapi URLs

## After Migration

**What works:**
- ✅ All images load from Strapi
- ✅ Complete independence from Ghost
- ✅ Faster loading (same server)
- ✅ Can delete Ghost server

**URL mapping saved:**
The script saves `image-url-mapping.json` with all URL translations:
```json
{
  "https://aikyamjobs.org/content/images/2024/01/logo.png": "/uploads/logo_abc123.png",
  "https://aikyamjobs.org/content/images/2024/02/photo.jpg": "/uploads/photo_def456.jpg"
}
```

Keep this file as reference in case you need to revert!

## Troubleshooting

### "Ghost images folder not found"
Make sure the folder is at:
```
/Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend/ghost-images/
```

### "Upload failed for some images"
- Check file permissions
- Make sure Strapi is running
- Verify API token has upload permissions
- Check Strapi upload size limits

### "Some images still show Ghost URLs"
- Re-run the migration script
- Check if those images exist in ghost-images folder
- Verify image filenames match exactly

## Quick Summary

**To fix everything:**

1. **Fix HTML in listings:**
   ```bash
   STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js
   ```

2. **Upload Ghost images folder to:**
   ```
   aikyamjobs-backend/ghost-images/
   ```

3. **Migrate images:**
   ```bash
   STRAPI_API_TOKEN=your_token node scripts/migrate-images-to-strapi.js
   ```

**Done!** All content is Markdown, all images are in Strapi, Ghost can be shut down.
