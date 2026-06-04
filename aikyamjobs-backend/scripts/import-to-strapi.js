const fs = require('fs');
const path = require('path');

// This script imports data to Strapi via the API
// You need to get an API token from Strapi admin first
// Go to Settings -> API Tokens -> Create new API Token with "Full access"

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function importData() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('\nTo use this script, you need to:');
    console.log('1. Go to http://localhost:1337/admin/settings/api-tokens');
    console.log('2. Create a new API token with "Full access" permissions');
    console.log('3. Run this script with: STRAPI_API_TOKEN=your_token node scripts/import-to-strapi.js');
    console.log('\nAlternatively, you can import the data manually via the Strapi admin UI using migration-processed.json\n');
    return;
  }

  try {
    // Load processed migration data
    const migrationData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../migration-processed.json'), 'utf8')
    );

    const { companies, jobs, categories } = migrationData;

    console.log('Starting import to Strapi via API...\n');

    // Helper function to make API requests
    async function apiRequest(endpoint, method = 'GET', data = null) {
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_TOKEN}`
        }
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${STRAPI_API_URL}${endpoint}`, options);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} - ${error}`);
      }

      return response.json();
    }

    // Step 1: Create categories
    console.log(`Creating ${categories.length} categories...`);
    const categoryMap = new Map();

    for (const cat of categories) {
      try {
        // Check if category already exists
        const existing = await apiRequest(`/categories?filters[slug][$eq]=${cat.slug}`);

        if (existing.data && existing.data.length > 0) {
          console.log(`  ✓ Category "${cat.name}" already exists`);
          categoryMap.set(cat.slug, existing.data[0].id);
        } else {
          const created = await apiRequest('/categories', 'POST', {
            data: {
              name: cat.name,
              slug: cat.slug
            }
          });
          console.log(`  ✓ Created category: ${cat.name}`);
          categoryMap.set(cat.slug, created.data.id);
        }
      } catch (error) {
        console.error(`  ✗ Error with category ${cat.name}:`, error.message);
      }
    }

    // Step 2: Create companies
    console.log(`\nCreating ${companies.length} companies...`);
    const companyMap = new Map();

    for (const company of companies) {
      try {
        // Check if company already exists
        const existing = await apiRequest(`/companies?filters[slug][$eq]=${company.slug}`);

        if (existing.data && existing.data.length > 0) {
          console.log(`  ✓ Company "${company.name}" already exists`);
          companyMap.set(company.slug, existing.data[0].id);
          continue;
        }

        const companyData = {
          name: company.name,
          slug: company.slug,
          excerpt: company.excerpt,
          description: company.description,
          htmlContent: company.htmlContent,
          plaintextContent: company.plaintextContent,
          website: company.website,
          location: company.location,
          publishDate: company.publishDate,
          author: company.author,
          featured: company.featured,
          metaTitle: company.metaTitle,
          metaDescription: company.metaDescription
        };

        const created = await apiRequest('/companies', 'POST', { data: companyData });
        companyMap.set(company.slug, created.data.id);
        console.log(`  ✓ Created company: ${company.name} (${company.slug})`);
      } catch (error) {
        console.error(`  ✗ Error creating company ${company.name}:`, error.message);
      }
    }

    // Step 3: Create jobs
    console.log(`\nCreating ${jobs.length} jobs...`);
    let jobsCreated = 0;
    let jobsSkipped = 0;
    let jobsFailed = 0;

    for (const job of jobs) {
      try {
        // Check if job already exists
        const existing = await apiRequest(`/jobs?filters[slug][$eq]=${job.slug}`);

        if (existing.data && existing.data.length > 0) {
          console.log(`  ~ Job "${job.title}" already exists, skipping`);
          jobsSkipped++;
          continue;
        }

        const jobData = {
          title: job.title,
          slug: job.slug,
          excerpt: job.excerpt,
          description: job.description,
          htmlContent: job.htmlContent,
          plaintextContent: job.plaintextContent,
          location: job.location,
          publishDate: job.publishDate,
          closingDate: job.closingDate,
          author: job.author,
          curatedBy: job.curatedBy,
          featured: job.featured,
          metaTitle: job.metaTitle,
          metaDescription: job.metaDescription
        };

        // Add company relationship if found
        if (job.companySlug && companyMap.has(job.companySlug)) {
          jobData.company = companyMap.get(job.companySlug);
        }

        const created = await apiRequest('/jobs', 'POST', { data: jobData });
        jobsCreated++;
        const companyInfo = job.companySlug ? ` → ${job.companySlug}` : '';
        console.log(`  ✓ Created job: ${job.title}${companyInfo}`);
      } catch (error) {
        console.error(`  ✗ Error creating job ${job.title}:`, error.message);
        jobsFailed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Import completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Categories: ${categoryMap.size} created/existing`);
    console.log(`  Companies:  ${companyMap.size} created/existing`);
    console.log(`  Jobs:       ${jobsCreated} created, ${jobsSkipped} skipped, ${jobsFailed} failed`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error during import:', error);
  }
}

// Run the import
importData().catch(error => {
  console.error('Failed to run import:', error);
  process.exit(1);
});
