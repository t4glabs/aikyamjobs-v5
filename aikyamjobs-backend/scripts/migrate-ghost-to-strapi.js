const fs = require('fs');
const path = require('path');

// Load the Ghost export data
const ghostData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../aikyamjobs_migration_export.json'), 'utf8')
);

const posts = ghostData.posts;
const tags = ghostData.tags;

// Build posts_tags relationships from posts' tags_json field
const postsTags = [];
posts.forEach(post => {
  if (post.tags_json) {
    const postTags = JSON.parse(post.tags_json);
    postTags.forEach(tag => {
      const tagObj = tags.find(t => t.slug === tag.slug);
      if (tagObj) {
        postsTags.push({ post_id: post.id, tag_id: tagObj.id });
      }
    });
  }
});

// Helper function to get tags for a post
function getTagsForPost(postId) {
  const postTagRelations = postsTags.filter(pt => pt.post_id === postId);
  return postTagRelations.map(pt => {
    const tag = tags.find(t => t.id === pt.tag_id);
    return tag ? { name: tag.name, slug: tag.slug } : null;
  }).filter(Boolean);
}

// Helper function to get company slug from post
function getCompanySlug(post) {
  // Ghost export has company_tag_slug field for jobs
  if (post.company_tag_slug) {
    return post.company_tag_slug;
  }
  return null;
}

// Separate companies and jobs
const companyPosts = posts.filter(p => {
  return p.type === 'company_profile' || p.is_company_profile === true;
});

const jobPosts = posts.filter(p => {
  return p.type === 'job_description' || (p.type !== 'company_profile' && p.is_company_profile !== true);
});

console.log(`Found ${companyPosts.length} company profiles and ${jobPosts.length} job descriptions`);

// Parse authors field
function parseAuthors(post) {
  if (post.authors) {
    return post.authors;
  }
  return null;
}

// Get closing date from post
function getClosingDate(post) {
  return post.closing_date || null;
}

// Helper to truncate text
function truncate(text, maxLength) {
  if (!text) return text;
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Process company data
const companies = companyPosts.map(post => {
  const postTags = getTagsForPost(post.id);
  const categories = postTags.filter(t =>
    !t.slug.includes('hash-') &&
    t.slug !== 'curated' &&
    !['remote', 'india', 'bangalore', 'delhi', 'mumbai', 'pune', 'hyderabad'].includes(t.slug)
  );

  const metaTitle = post.meta_title || post.og_title || post.twitter_title || post.title;
  const metaDesc = post.meta_description || post.og_description || post.twitter_description || post.custom_excerpt || post.excerpt;

  return {
    name: post.title,
    slug: post.slug,
    excerpt: post.custom_excerpt || post.excerpt,
    description: post.html,
    htmlContent: post.html,
    plaintextContent: post.plaintext,
    website: null, // Can extract from content if needed
    location: postTags.find(t => ['remote', 'india', 'bangalore', 'delhi', 'mumbai', 'pune', 'hyderabad'].includes(t.slug))?.name,
    publishDate: post.published_at,
    author: parseAuthors(post),
    featured: post.featured === 1,
    metaTitle: truncate(metaTitle, 60),
    metaDescription: truncate(metaDesc, 160),
    categories: categories,
    featureImageUrl: post.feature_image || null,
    socialImageUrl: post.og_image || post.twitter_image || post.feature_image || null
  };
});

// Process job data
const jobs = jobPosts.map(post => {
  const postTags = getTagsForPost(post.id);
  const companySlug = getCompanySlug(post);
  const categories = postTags.filter(t =>
    !t.slug.includes('hash-') &&
    t.slug !== 'curated' &&
    !['remote', 'india', 'bangalore', 'delhi', 'mumbai', 'pune', 'hyderabad'].includes(t.slug) &&
    (!companySlug || t.slug !== companySlug)
  );

  const metaTitle = post.meta_title || post.og_title || post.twitter_title || post.title;
  const metaDesc = post.meta_description || post.og_description || post.twitter_description || post.custom_excerpt || post.excerpt;

  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.custom_excerpt || post.excerpt,
    description: post.html,
    htmlContent: post.html,
    plaintextContent: post.plaintext,
    location: postTags.find(t => ['remote', 'india', 'bangalore', 'delhi', 'mumbai', 'pune', 'hyderabad'].includes(t.slug))?.name,
    publishDate: post.published_at,
    closingDate: getClosingDate(post),
    author: parseAuthors(post),
    curatedBy: parseAuthors(post),
    featured: post.featured === 1,
    metaTitle: truncate(metaTitle, 60),
    metaDescription: truncate(metaDesc, 160),
    companySlug: companySlug,
    categories: categories,
    featureImageUrl: post.feature_image || null,
    socialImageUrl: post.og_image || post.twitter_image || post.feature_image || null
  };
});

// Get all unique categories
const allCategories = new Set();
[...companies, ...jobs].forEach(item => {
  item.categories.forEach(cat => allCategories.add(JSON.stringify(cat)));
});

const uniqueCategories = Array.from(allCategories).map(cat => JSON.parse(cat));

console.log(`\nExtracted ${uniqueCategories.length} unique categories`);
console.log(`Categories:`, uniqueCategories.map(c => c.name).join(', '));

// Export processed data
const outputData = {
  companies,
  jobs,
  categories: uniqueCategories
};

fs.writeFileSync(
  path.join(__dirname, '../migration-processed.json'),
  JSON.stringify(outputData, null, 2)
);

console.log('\n✅ Migration data processed and saved to migration-processed.json');
console.log(`\nSummary:`);
console.log(`- Companies: ${companies.length}`);
console.log(`- Jobs: ${jobs.length}`);
console.log(`- Categories: ${uniqueCategories.length}`);
console.log(`\nNext step: Run the import script to create entries in Strapi`);
