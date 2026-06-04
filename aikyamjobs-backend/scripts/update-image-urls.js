const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Updates all job and company descriptions with Strapi image URLs
// Usage: STRAPI_API_TOKEN=your_token node scripts/update-image-urls.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const DELAY_BETWEEN_UPDATES = 500; // 500ms delay between updates

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateImageUrls() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('Run: STRAPI_API_TOKEN=your_token node scripts/update-image-urls.js\n');
    return;
  }

  try {
    console.log('Starting URL updates in content...\n');

    // Load URL mapping
    const mappingFile = path.join(__dirname, '../image-url-mapping.json');
    if (!fs.existsSync(mappingFile)) {
      console.log('⚠️  No image-url-mapping.json found. Run upload script first.\n');
      return;
    }

    const mappingData = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
    const urlMapping = new Map(Object.entries(mappingData));
    console.log(`Loaded ${urlMapping.size} image URL mappings\n`);

    // Helper function for API requests
    async function apiRequest(endpoint, method = 'GET', data = null) {
      const config = {
        method,
        url: `${STRAPI_API_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return response.data;
    }

    // Update Jobs
    console.log('🔄 Updating Jobs...\n');
    const jobsResponse = await apiRequest('/api/jobs?pagination[pageSize]=200');
    const jobs = jobsResponse.data;

    let jobsUpdated = 0;
    let jobsSkipped = 0;
    let jobsFailed = 0;

    for (const job of jobs) {
      try {
        let description = job.attributes.description;
        let updated = false;

        if (!description) {
          jobsSkipped++;
          continue;
        }

        // Replace all Ghost URLs with Strapi URLs
        for (const [ghostUrl, strapiUrl] of urlMapping.entries()) {
          if (description.includes(ghostUrl)) {
            const regex = new RegExp(ghostUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            description = description.replace(regex, `${STRAPI_API_URL}${strapiUrl}`);
            updated = true;
          }
        }

        if (updated) {
          await apiRequest(`/api/jobs/${job.id}`, 'PUT', {
            data: { description }
          });
          jobsUpdated++;
          console.log(`  ✓ Updated job: ${job.attributes.title}`);
          await sleep(DELAY_BETWEEN_UPDATES);
        } else {
          jobsSkipped++;
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`  ✗ Failed: ${job.attributes.title} - ${errorMsg}`);
        jobsFailed++;
        await sleep(DELAY_BETWEEN_UPDATES);
      }
    }

    console.log(`\nJobs: ${jobsUpdated} updated, ${jobsSkipped} skipped, ${jobsFailed} failed\n`);

    // Update Companies
    console.log('🔄 Updating Companies...\n');
    const companiesResponse = await apiRequest('/api/companies?pagination[pageSize]=200');
    const companies = companiesResponse.data;

    let companiesUpdated = 0;
    let companiesSkipped = 0;
    let companiesFailed = 0;

    for (const company of companies) {
      try {
        let description = company.attributes.description;
        let updated = false;

        if (!description) {
          companiesSkipped++;
          continue;
        }

        // Replace all Ghost URLs with Strapi URLs
        for (const [ghostUrl, strapiUrl] of urlMapping.entries()) {
          if (description.includes(ghostUrl)) {
            const regex = new RegExp(ghostUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
            description = description.replace(regex, `${STRAPI_API_URL}${strapiUrl}`);
            updated = true;
          }
        }

        if (updated) {
          await apiRequest(`/api/companies/${company.id}`, 'PUT', {
            data: { description }
          });
          companiesUpdated++;
          console.log(`  ✓ Updated company: ${company.attributes.name}`);
          await sleep(DELAY_BETWEEN_UPDATES);
        } else {
          companiesSkipped++;
        }
      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`  ✗ Failed: ${company.attributes.name} - ${errorMsg}`);
        companiesFailed++;
        await sleep(DELAY_BETWEEN_UPDATES);
      }
    }

    console.log(`\nCompanies: ${companiesUpdated} updated, ${companiesSkipped} skipped, ${companiesFailed} failed\n`);

    console.log('='.repeat(60));
    console.log('✅ URL update completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Jobs updated:       ${jobsUpdated}`);
    console.log(`  Companies updated:  ${companiesUpdated}`);
    console.log(`  Total updated:      ${jobsUpdated + companiesUpdated}`);
    console.log('='.repeat(60));
    console.log('\n🎉 All content now uses Strapi-hosted images!');

  } catch (error) {
    console.error('\nFatal error during URL updates:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the update
updateImageUrls().catch(error => {
  console.error('Failed to run URL updates:', error.message);
  process.exit(1);
});
