const fs = require('fs');
const { JSDOM } = require('jsdom');

/**
 * Ghost to Strapi Import Script
 * Imports job posts from Ghost export to Strapi
 */

// Helper: Convert HTML to Markdown (simple conversion)
function htmlToMarkdown(html) {
  if (!html) return '';

  // Remove Ghost-specific elements
  html = html.replace(/<div class="kg-card[^>]*>.*?<\/div>/gs, '');
  html = html.replace(/<figure[^>]*>.*?<\/figure>/gs, '');

  // Convert basic HTML to markdown
  let markdown = html
    .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
    .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
    .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
    .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
    .replace(/<\/?ul[^>]*>/gi, '\n')
    .replace(/<\/?ol[^>]*>/gi, '\n')
    .replace(/<hr\s*\/?>/gi, '\n---\n')
    .replace(/<[^>]+>/g, '') // Remove remaining HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n') // Remove excessive line breaks
    .trim();

  return markdown;
}

// Helper: Extract metadata from tags
function extractMetadata(tags, postTitle) {
  const metadata = {
    company: null,
    location: null,
    jobType: 'full-time',
    experienceLevel: null,
    salary: null,
    deadline: null,
    categories: [],
    skills: [],
  };

  const jobTypeMap = {
    'full-time': 'full-time',
    'full time': 'full-time',
    'part-time': 'part-time',
    'part time': 'part-time',
    'contract': 'contract',
    'freelance': 'freelance',
    'internship': 'internship',
    'fellowship': 'fellowship',
  };

  const experienceMap = {
    'fresher': 'entry',
    'entry': 'entry',
    'entry-level': 'entry',
    'junior': 'junior',
    'mid': 'mid',
    'mid-level': 'mid',
    'senior': 'senior',
    'lead': 'senior',
  };

  const skillTags = [
    'project-management', 'fundraising', 'communications', 'monitoring&evaluation',
    'administration', 'data', 'digital-marketing', 'partnerships', 'accounting',
    'leadership', 'design', 'research', 'policy', 'advocacy', 'technology'
  ];

  tags.forEach(tag => {
    const tagSlug = tag.slug.toLowerCase();
    const tagName = tag.name;

    // Extract deadline from #closes-YYYY-MM-DD format
    if (tagSlug.startsWith('#closes-')) {
      const dateStr = tagSlug.replace('#closes-', '');
      metadata.deadline = dateStr;
    }

    // Extract location
    const locations = ['delhi', 'mumbai', 'bangalore', 'hyderabad', 'chennai', 'kolkata',
                       'pune', 'ahmedabad', 'kerala', 'remote', 'india'];
    if (locations.some(loc => tagSlug.includes(loc))) {
      metadata.location = tagName;
    }

    // Extract job type
    if (jobTypeMap[tagSlug]) {
      metadata.jobType = jobTypeMap[tagSlug];
    }

    // Extract experience level
    if (experienceMap[tagSlug]) {
      metadata.experienceLevel = experienceMap[tagSlug];
    }

    // Extract categories/skills
    if (skillTags.includes(tagSlug)) {
      metadata.categories.push(tagName);
    }

    // Company name (usually the first tag or specific company tags)
    if (!metadata.company && tag.slug && !locations.includes(tagSlug) &&
        !Object.keys(jobTypeMap).includes(tagSlug) &&
        !Object.keys(experienceMap).includes(tagSlug) &&
        !skillTags.includes(tagSlug) &&
        !tagSlug.startsWith('#')) {
      metadata.company = tagName;
    }
  });

  // Extract salary from title if present (e.g., "₹1.80-2.40 LPA")
  const salaryMatch = postTitle.match(/₹[\d.]+-[\d.]+\s*(LPA|L|Lakhs?|\/month)/i);
  if (salaryMatch) {
    metadata.salary = salaryMatch[0];
  }

  return metadata;
}

async function importGhostData() {
  console.log('🚀 Starting Ghost to Strapi import...\n');

  // Load Strapi
  const Strapi = require('@strapi/strapi');
  const app = await Strapi().load();
  const strapi = app;

  try {
    // Read Ghost export
    const ghostData = JSON.parse(fs.readFileSync('./scripts/ghost-recent-50.json', 'utf8'));
    const posts = ghostData.db[0].data.posts;
    const tags = ghostData.db[0].data.tags;
    const postsTags = ghostData.db[0].data.posts_tags;

    console.log(`📦 Found ${posts.length} posts to import\n`);

    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const post of posts) {
      try {
        // Check if already imported
        const existing = await strapi.db.query('api::job.job').findOne({
          where: { slug: post.slug }
        });

        if (existing) {
          console.log(`⏭️  Skipping: ${post.title} (already exists)`);
          skipped++;
          continue;
        }

        // Get post tags
        const postTagIds = postsTags.filter(pt => pt.post_id === post.id).map(pt => pt.tag_id);
        const postTags = tags.filter(t => postTagIds.includes(t.id));

        // Extract metadata
        const metadata = extractMetadata(postTags, post.title);

        // Convert HTML to Markdown
        const description = htmlToMarkdown(post.html || '');

        // Find or create company
        let companyId = null;
        if (metadata.company) {
          const companySlug = metadata.company.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          let company = await strapi.db.query('api::company.company').findOne({
            where: { slug: companySlug }
          });

          if (!company) {
            company = await strapi.db.query('api::company.company').create({
              data: {
                name: metadata.company,
                slug: companySlug,
                publishedAt: new Date(),
              }
            });
            console.log(`  ✨ Created company: ${metadata.company}`);
          }

          companyId = company.id;
        }

        // Find or create categories
        const categoryIds = [];
        for (const catName of metadata.categories) {
          const catSlug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

          let category = await strapi.db.query('api::category.category').findOne({
            where: { slug: catSlug }
          });

          if (!category) {
            category = await strapi.db.query('api::category.category').create({
              data: {
                name: catName,
                slug: catSlug,
                publishedAt: new Date(),
              }
            });
          }

          categoryIds.push(category.id);
        }

        // Create job post
        const jobData = {
          title: post.title,
          slug: post.slug,
          description: description || post.custom_excerpt || 'No description available.',
          location: metadata.location,
          jobType: metadata.jobType,
          experienceLevel: metadata.experienceLevel,
          salary: metadata.salary,
          deadline: metadata.deadline ? new Date(metadata.deadline) : null,
          featured: post.featured === 1,
          company: companyId,
          categories: categoryIds,
          metaDescription: post.custom_excerpt?.substring(0, 160),
          publishedAt: post.published_at ? new Date(post.published_at) : new Date(),
        };

        await strapi.db.query('api::job.job').create({ data: jobData });

        console.log(`✅ Imported: ${post.title}`);
        imported++;

      } catch (error) {
        console.error(`❌ Error importing "${post.title}":`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Import Summary:');
    console.log(`   ✅ Imported: ${imported}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📦 Total: ${posts.length}`);

  } catch (error) {
    console.error('💥 Fatal error:', error);
  } finally {
    await app.destroy();
    console.log('\n🏁 Import complete!');
  }
}

importGhostData();
