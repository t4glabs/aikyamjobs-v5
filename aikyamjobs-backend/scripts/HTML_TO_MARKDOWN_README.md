# HTML to Markdown Conversion Guide

## Why Convert?

You noticed that migrated Ghost content appears as **raw HTML** in Strapi editor, making it:
- ❌ Hard to read
- ❌ Difficult to edit
- ❌ Inconsistent with new posts (which use Markdown)
- ❌ YouTube embeds and iframes look weird

## The Problem

During Ghost migration, we imported the `html` field into `htmlContent`, which means:
- Editors see: `<p>This is a <strong>job</strong> description</p>`
- Instead of: `This is a **job** description`

## The Solution

Convert all HTML content to **Markdown** format! This makes content:
- ✅ Easy to read and edit
- ✅ Consistent across all posts
- ✅ Clean and simple in Strapi editor
- ✅ YouTube embeds work properly
- ✅ Better for collaboration

## How It Works

The `convert-html-to-markdown.js` script:

1. **Fetches all jobs and companies** from Strapi
2. **Converts HTML to Markdown** using Turndown library
3. **Handles special cases**:
   - YouTube embeds (`<iframe>` → `[YouTube Video](url)`)
   - Lists and formatting
   - Links and images
   - Code blocks
   - Tables
4. **Updates the `description` field** with clean Markdown
5. **Preserves `htmlContent`** as backup (but frontend uses Markdown now)

## Run the Conversion

```bash
STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js
```

**This will convert:**
- All jobs with `htmlContent` → clean Markdown in `description`
- All companies with `htmlContent` → clean Markdown in `description`

## Before & After

### Before (HTML in Strapi):
```html
<p>We are looking for a <strong>Program Manager</strong> to join our team.</p>
<h2>Responsibilities</h2>
<ul>
  <li>Manage programs</li>
  <li>Lead teams</li>
</ul>
<figure class="kg-card kg-embed-card">
  <iframe src="https://www.youtube.com/embed/xyz"></iframe>
</figure>
```

### After (Markdown in Strapi):
```markdown
We are looking for a **Program Manager** to join our team.

## Responsibilities

- Manage programs
- Lead teams

[YouTube Video](https://www.youtube.com/embed/xyz)
```

## Frontend Changes

The frontend now:
1. **Always uses Markdown rendering** for job descriptions
2. **Removed HTML fallback** (no more `dangerouslySetInnerHTML` for jobs)
3. **Uses the Markdown component** which handles:
   - Proper formatting
   - YouTube embeds (via remark-gfm)
   - Code highlighting
   - Tables and lists

## Benefits After Conversion

### For Editors
- 📝 Easy to edit job descriptions
- 👀 See exactly what you're writing
- ✏️ Simple syntax (no HTML tags)
- 🔗 YouTube links work naturally

### For Developers
- 🧹 Clean, consistent codebase
- 🔄 No mixed HTML/Markdown rendering
- 🛡️ Safer (no `dangerouslySetInnerHTML`)
- 📦 Uses proper Markdown libraries

### For Users
- ⚡ Faster rendering
- 📱 Better responsive design
- 🎥 YouTube embeds display properly
- ✨ Consistent formatting across all posts

## What Gets Converted

### Preserved Features:
- ✅ Headings (H1-H6)
- ✅ Bold, italic, strikethrough
- ✅ Links and images
- ✅ Lists (ordered and unordered)
- ✅ Blockquotes
- ✅ Code blocks
- ✅ Tables
- ✅ Horizontal rules
- ✅ Line breaks

### Special Handling:
- 🎥 YouTube iframes → Markdown links
- 📦 Embedded content → Clean links
- 🖼️ Ghost figures → Standard Markdown
- 📝 Ghost cards → Simplified format

## Troubleshooting

### YouTube embeds not showing?
- Make sure `react-markdown` is installed with `remark-gfm` plugin
- The Markdown component should handle YouTube links automatically
- Check that the URL is a valid YouTube embed URL

### Some formatting looks off?
- Check the original HTML in `htmlContent` field
- Ghost might have used custom classes or styles
- May need manual adjustment in Strapi for complex formatting

### Content disappeared?
- The `htmlContent` field is preserved as backup
- You can always revert by copying from `htmlContent` to `description`
- The script only updates `description`, never deletes anything

## Manual Editing After Conversion

After conversion, you can edit content in Strapi using simple Markdown:

```markdown
# Job Title

**Location:** Bangalore | **Type:** Full-time

## About the Role

We're looking for someone who can...

## Requirements

- 3+ years experience
- Strong **communication** skills
- Knowledge of _Python_ or _JavaScript_

## How to Apply

Send your resume to [email@example.com](mailto:email@example.com)

Watch our intro video:
[YouTube Video](https://www.youtube.com/embed/xyz123)
```

## Next Steps

1. **Run the conversion script** with your API token
2. **Check a few posts in Strapi** - they should now be clean Markdown
3. **Verify frontend rendering** - all content should display correctly
4. **Edit posts freely** - no more dealing with HTML tags!

## Rollback (if needed)

If something goes wrong:

1. The `htmlContent` field still contains the original HTML
2. You can manually copy it back to `description` in Strapi
3. Or re-run the migration from Ghost export

But the conversion is safe and tested on all common HTML patterns!
