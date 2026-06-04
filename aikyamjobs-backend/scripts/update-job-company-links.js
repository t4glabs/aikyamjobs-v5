const fs = require('fs');
const path = require('path');

// This script updates existing jobs with company relationships
// Usage: STRAPI_API_TOKEN=your_token node scripts/update-job-company-links.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function updateJobCompanyLinks() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('\nRun this script with: STRAPI_API_TOKEN=your_token node scripts/update-job-company-links.js\n');
    return;
  }

  try {
    // Load processed migration data
    const migrationData = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../migration-processed.json'), 'utf8')
    );

    const { jobs, companies } = migrationData;

    console.log('Starting to update job-company relationships...\n');

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

    // First, build a map of company slugs to IDs
    console.log('Fetching companies from Strapi...');
    const companyMap = new Map();

    for (const company of companies) {
      try {
        const existing = await apiRequest(`/companies?filters[slug][$eq]=${company.slug}`);
        if (existing.data && existing.data.length > 0) {
          companyMap.set(company.slug, existing.data[0].id);
        }
      } catch (error) {
        console.error(`  ✗ Error fetching company ${company.slug}:`, error.message);
      }
    }

    console.log(`Found ${companyMap.size} companies in Strapi\n`);

    // Now update jobs with company relationships
    console.log(`Updating ${jobs.length} jobs...`);
    let updated = 0;
    let skipped = 0;
    let failed = 0;

    for (const job of jobs) {
      try {
        // Get the job from Strapi
        const existing = await apiRequest(`/jobs?filters[slug][$eq]=${job.slug}`);

        if (!existing.data || existing.data.length === 0) {
          console.log(`  ~ Job "${job.title}" not found in Strapi, skipping`);
          skipped++;
          continue;
        }

        const strapiJob = existing.data[0];
        const jobId = strapiJob.id;

        // Check if job already has a company
        const currentCompanyId = strapiJob.attributes?.company?.data?.id;

        // Get the company ID for this job
        const companyId = job.companySlug ? companyMap.get(job.companySlug) : null;

        if (!companyId) {
          console.log(`  ~ Job "${job.title}" has no company in migration data`);
          skipped++;
          continue;
        }

        // Only update if company is different or missing
        if (currentCompanyId && currentCompanyId === companyId) {
          console.log(`  ✓ Job "${job.title}" already linked to correct company`);
          skipped++;
          continue;
        }

        // Update the job with company relationship
        await apiRequest(`/jobs/${jobId}`, 'PUT', {
          data: {
            company: companyId
          }
        });

        updated++;
        console.log(`  ✓ Updated: ${job.title} → ${job.companySlug}`);
      } catch (error) {
        console.error(`  ✗ Error updating job ${job.title}:`, error.message);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Update completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Jobs updated:  ${updated}`);
    console.log(`  Jobs skipped:  ${skipped}`);
    console.log(`  Jobs failed:   ${failed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Fatal error during update:', error);
  }
}

// Run the update
updateJobCompanyLinks().catch(error => {
  console.error('Failed to run update:', error);
  process.exit(1);
});
