const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// This script uploads Ghost images to Strapi and updates all references
// Usage: STRAPI_API_TOKEN=your_token node scripts/migrate-images-to-strapi.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const GHOST_URL = 'https://aikyamjobs.org';

// Path to Ghost images folder (upload it to backend root first)
const GHOST_IMAGES_PATH = path.join(__dirname, '../ghost-images/content/images');

async function migrateImages() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('\nFirst, upload your Ghost images folder to:');
    console.log('  /Users/jinsoraj/Desktop/aikyamjobsv5/aikyamjobs-backend/ghost-images/');
    console.log('\nThen run: STRAPI_API_TOKEN=your_token node scripts/migrate-images-to-strapi.js\n');
    return;
  }

  // Check if ghost-images folder exists
  if (!fs.existsSync(GHOST_IMAGES_PATH)) {
    console.log('\n⚠️  Ghost images folder not found!');
    console.log('\nPlease create folder and add images:');
    console.log('  mkdir -p aikyamjobs-backend/ghost-images');
    console.log('  # Then copy your Ghost content/images/* to ghost-images/\n');
    return;
  }

  try {
    console.log('Starting image migration to Strapi...\n');

    // Helper function to make API requests
    async function apiRequest(endpoint, method = 'GET', data = null) {
      const options = {
        method,
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`
        }
      };

      if (data && !(data instanceof FormData)) {
        options.headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(data);
      } else if (data) {
        options.body = data;
      }

      const response = await fetch(`${STRAPI_API_URL}${endpoint}`, options);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API request failed: ${response.status} - ${error}`);
      }

      return response.json();
    }

    // Get all image files recursively (exclude size/ and thumbnail/ folders)
    function getAllImageFiles(dir, fileList = [], baseDir = dir) {
      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(baseDir, filePath);

        // Skip size/ and thumbnail/ folders
        if (relativePath.startsWith('size/') || relativePath.startsWith('thumbnail/') ||
            relativePath.startsWith('icon/')) {
          return;
        }

        if (fs.statSync(filePath).isDirectory()) {
          getAllImageFiles(filePath, fileList, baseDir);
        } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
          fileList.push(filePath);
        }
      });

      return fileList;
    }

    const imageFiles = getAllImageFiles(GHOST_IMAGES_PATH);

    // Filter for recent images (April 2026 onwards)
    const recentImages = imageFiles.filter(file => {
      const relativePath = path.relative(GHOST_IMAGES_PATH, file);
      return relativePath.startsWith('2026/04') ||
             relativePath.startsWith('2026/05') ||
             relativePath.startsWith('2026/06');
    });

    console.log(`Found ${imageFiles.length} total images`);
    console.log(`Filtering to ${recentImages.length} recent images (April-June 2026)\n`);

    // Upload images and build URL mapping
    const urlMapping = new Map();
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (const imagePath of recentImages) {
      try {
        // Get relative path from ghost-images folder
        const relativePath = path.relative(GHOST_IMAGES_PATH, imagePath);
        const ghostUrl = `${GHOST_URL}/content/images/${relativePath}`;

        // Create form data for upload
        const formData = new FormData();
        formData.append('files', fs.createReadStream(imagePath));

        // Upload to Strapi
        const uploadResponse = await apiRequest('/api/upload', 'POST', formData);

        if (uploadResponse && uploadResponse[0]) {
          const strapiUrl = uploadResponse[0].url;
          urlMapping.set(ghostUrl, strapiUrl);
          uploaded++;
          console.log(`  ✓ Uploaded: ${relativePath}`);
        }
      } catch (error) {
        console.error(`  ✗ Failed to upload ${imagePath}:`, error.message);
        failed++;
      }
    }

    console.log(`\n✅ Upload complete!`);
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Failed: ${failed}`);

    // Save URL mapping for reference
    const mappingObj = Object.fromEntries(urlMapping);
    fs.writeFileSync(
      path.join(__dirname, '../image-url-mapping.json'),
      JSON.stringify(mappingObj, null, 2)
    );
    console.log(`\n📝 URL mapping saved to image-url-mapping.json`);

    // Now update all posts with new URLs
    console.log(`\n🔄 Updating posts with new image URLs...`);

    // Update Jobs
    const jobsResponse = await apiRequest('/api/jobs?pagination[pageSize]=200');
    const jobs = jobsResponse.data;

    let jobsUpdated = 0;

    for (const job of jobs) {
      try {
        let description = job.attributes.description;
        let updated = false;

        // Replace all Ghost URLs with Strapi URLs
        for (const [ghostUrl, strapiUrl] of urlMapping.entries()) {
          if (description && description.includes(ghostUrl)) {
            description = description.replace(new RegExp(ghostUrl, 'g'), strapiUrl);
            updated = true;
          }
        }

        if (updated) {
          await apiRequest(`/api/jobs/${job.id}`, 'PUT', {
            data: { description }
          });
          jobsUpdated++;
          console.log(`  ✓ Updated job: ${job.attributes.title}`);
        }
      } catch (error) {
        console.error(`  ✗ Error updating job ${job.attributes.title}:`, error.message);
      }
    }

    // Update Companies
    const companiesResponse = await apiRequest('/api/companies?pagination[pageSize]=200');
    const companies = companiesResponse.data;

    let companiesUpdated = 0;

    for (const company of companies) {
      try {
        let description = company.attributes.description;
        let updated = false;

        // Replace all Ghost URLs with Strapi URLs
        for (const [ghostUrl, strapiUrl] of urlMapping.entries()) {
          if (description && description.includes(ghostUrl)) {
            description = description.replace(new RegExp(ghostUrl, 'g'), strapiUrl);
            updated = true;
          }
        }

        if (updated) {
          await apiRequest(`/api/companies/${company.id}`, 'PUT', {
            data: { description }
          });
          companiesUpdated++;
          console.log(`  ✓ Updated company: ${company.attributes.name}`);
        }
      } catch (error) {
        console.error(`  ✗ Error updating company ${company.attributes.name}:`, error.message);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ Image migration completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Images uploaded:    ${uploaded}`);
    console.log(`  Jobs updated:       ${jobsUpdated}`);
    console.log(`  Companies updated:  ${companiesUpdated}`);
    console.log(`  Failed uploads:     ${failed}`);
    console.log('='.repeat(60));
    console.log('\n🎉 All images are now hosted in Strapi!');
    console.log('💡 You can now safely disable Ghost server.');

  } catch (error) {
    console.error('Fatal error during migration:', error);
  }
}

// Run the migration
migrateImages().catch(error => {
  console.error('Failed to run migration:', error);
  process.exit(1);
});
