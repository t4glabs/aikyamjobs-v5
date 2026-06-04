const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Creates categories that exist in migration data but not in Strapi
// Usage: STRAPI_API_TOKEN=your_token node scripts/create-missing-categories.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;

async function createMissingCategories() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('Run: STRAPI_API_TOKEN=your_token node scripts/create-missing-categories.js\n');
    return;
  }

  try {
    console.log('Checking for missing categories...\n');

    // Load migration data
    const migrationFile = path.join(__dirname, '../migration-processed.json');
    if (!fs.existsSync(migrationFile)) {
      console.log('⚠️  migration-processed.json not found\n');
      return;
    }

    const migrationData = JSON.parse(fs.readFileSync(migrationFile, 'utf8'));
    console.log(`Found ${migrationData.categories.length} categories in migration data\n`);

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

    // Get all existing categories from Strapi
    console.log('Fetching existing categories from Strapi...');
    const categoriesResponse = await apiRequest('/api/categories?pagination[pageSize]=200');
    const existingCategories = categoriesResponse.data;

    // Build set of existing category slugs
    const existingSlugs = new Set(existingCategories.map(cat => cat.attributes.slug));
    console.log(`Found ${existingCategories.length} existing categories in Strapi\n`);

    // Find missing categories
    const missingCategories = migrationData.categories.filter(
      cat => !existingSlugs.has(cat.slug)
    );

    console.log(`Found ${missingCategories.length} missing categories\n`);

    if (missingCategories.length === 0) {
      console.log('✅ All categories already exist in Strapi!');
      return;
    }

    // Create missing categories
    console.log('Creating missing categories...\n');
    let created = 0;
    let failed = 0;

    for (const category of missingCategories) {
      try {
        await apiRequest('/api/categories', 'POST', {
          data: {
            name: category.name,
            slug: category.slug
          }
        });
        created++;
        console.log(`  ✓ Created: ${category.name} (${category.slug})`);

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`  ✗ Failed: ${category.name} - ${errorMsg}`);
        failed++;
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Missing categories created!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Created:  ${created}`);
    console.log(`  Failed:   ${failed}`);
    console.log(`  Total:    ${existingCategories.length + created}`);
    console.log('='.repeat(60));
    console.log('\n💡 Now run: node scripts/link-job-categories.js');
    console.log('   to link jobs with these new categories.');

  } catch (error) {
    console.error('\nFatal error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Run the creation
createMissingCategories().catch(error => {
  console.error('Failed to create categories:', error.message);
  process.exit(1);
});
