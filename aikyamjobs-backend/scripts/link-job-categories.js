const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Links jobs with their categories based on migration data
// Usage: STRAPI_API_TOKEN=your_token node scripts/link-job-categories.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function linkJobCategories() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('Run: STRAPI_API_TOKEN=your_token node scripts/link-job-categories.js\n');
    return;
  }

  try {
    console.log('Starting job-category linking...\n');

    // Load migration data
    const migrationFile = path.join(__dirname, '../migration-processed.json');
    if (!fs.existsSync(migrationFile)) {
      console.log('⚠️  migration-processed.json not found\n');
      return;
    }

    const migrationData = JSON.parse(fs.readFileSync(migrationFile, 'utf8'));
    console.log(`Loaded ${migrationData.jobs.length} jobs from migration data\n`);

    // Helper function for API requests
    async function apiRequest(endpoint, method = 'GET', data = null) {
      const config = {
        method,
        url: `${STRAPI_API_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    }

    // Get all categories from Strapi
    console.log('Fetching categories from Strapi...');
    const categoriesResponse = await apiRequest('/api/categories?pagination[pageSize]=200');
    const categories = categoriesResponse.data;

    // Build category slug to ID map
    const categoryMap = new Map();
    categories.forEach(cat => {
      categoryMap.set(cat.attributes.slug, cat.id);
    });

    console.log(`Found ${categories.length} categories in Strapi\n`);

    // Get all jobs from Strapi
    console.log('Fetching jobs from Strapi...');
    const jobsResponse = await apiRequest('/api/jobs?pagination[pageSize]=200');
    const strapiJobs = jobsResponse.data;

    // Build job slug to ID map
    const jobMap = new Map();
    strapiJobs.forEach(job => {
      jobMap.set(job.attributes.slug, job.id);
    });

    console.log(`Found ${strapiJobs.length} jobs in Strapi\n`);

    // Link jobs with categories
    console.log('Linking jobs with categories...\n');
    let linked = 0;
    let skipped = 0;
    let failed = 0;

    for (const migrationJob of migrationData.jobs) {
      try {
        // Find matching Strapi job
        if (!jobMap.has(migrationJob.slug)) {
          console.log(`  ⊘ Job not found in Strapi: ${migrationJob.title}`);
          skipped++;
          continue;
        }

        // Get category IDs for this job
        if (!migrationJob.categories || migrationJob.categories.length === 0) {
          skipped++;
          continue;
        }

        const categoryIds = migrationJob.categories
          .map(cat => categoryMap.get(cat.slug))
          .filter(id => id !== undefined);

        if (categoryIds.length === 0) {
          skipped++;
          continue;
        }

        const jobId = jobMap.get(migrationJob.slug);

        // Update job with category relationships
        await apiRequest(`/api/jobs/${jobId}`, 'PUT', {
          data: {
            categories: categoryIds
          }
        });

        linked++;
        console.log(`  ✓ Linked ${categoryIds.length} categories to: ${migrationJob.title}`);

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`  ✗ Failed: ${migrationJob.title} - ${errorMsg}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Category linking completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Jobs linked:    ${linked}`);
    console.log(`  Jobs skipped:   ${skipped}`);
    console.log(`  Jobs failed:    ${failed}`);
    console.log('='.repeat(60));
    console.log('\n🎉 Jobs are now linked with categories!');
    console.log('💡 Category filtering should now work on /jobs page.');

  } catch (error) {
    console.error('\nFatal error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the linking
linkJobCategories().catch(error => {
  console.error('Failed to link categories:', error.message);
  process.exit(1);
});
