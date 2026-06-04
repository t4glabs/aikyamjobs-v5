const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

// Improved image migration with better error handling and batch processing
// Usage: STRAPI_API_TOKEN=your_token node scripts/migrate-images-batch.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const GHOST_URL = 'https://aikyamjobs.org';
const GHOST_IMAGES_PATH = path.join(__dirname, '../ghost-images/content/images');
const BATCH_SIZE = 5; // Upload 5 images at a time
const DELAY_BETWEEN_BATCHES = 1000; // 1 second delay between batches

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function migrateImages() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('Run: STRAPI_API_TOKEN=your_token node scripts/migrate-images-batch.js\n');
    return;
  }

  if (!fs.existsSync(GHOST_IMAGES_PATH)) {
    console.log('\n⚠️  Ghost images folder not found at:', GHOST_IMAGES_PATH);
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
      } else if (data && data instanceof FormData) {
        // Let FormData set the Content-Type with boundary
        options.body = data;
      }

      const response = await fetch(`${STRAPI_API_URL}${endpoint}`, options);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`${response.status} - ${error}`);
      }

      return response.json();
    }

    // Get all image files recursively (exclude size/ and thumbnail/ folders)
    function getAllImageFiles(dir, fileList = [], baseDir = dir) {
      if (!fs.existsSync(dir)) {
        return fileList;
      }

      const files = fs.readdirSync(dir);

      files.forEach(file => {
        const filePath = path.join(dir, file);
        const relativePath = path.relative(baseDir, filePath);

        // Skip size/, thumbnail/, and icon/ folders
        if (relativePath.startsWith('size/') || relativePath.startsWith('thumbnail/') ||
            relativePath.startsWith('icon/')) {
          return;
        }

        try {
          if (fs.statSync(filePath).isDirectory()) {
            getAllImageFiles(filePath, fileList, baseDir);
          } else if (/\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file)) {
            fileList.push(filePath);
          }
        } catch (err) {
          console.error(`Error accessing ${filePath}:`, err.message);
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

    // Load existing mapping if it exists
    const mappingFile = path.join(__dirname, '../image-url-mapping.json');
    let urlMapping = new Map();
    if (fs.existsSync(mappingFile)) {
      try {
        const existingMapping = JSON.parse(fs.readFileSync(mappingFile, 'utf8'));
        urlMapping = new Map(Object.entries(existingMapping));
        console.log(`Loaded ${urlMapping.size} existing mappings\n`);
      } catch (err) {
        console.log('Could not load existing mapping, starting fresh\n');
      }
    }

    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    // Process images in batches
    for (let i = 0; i < recentImages.length; i += BATCH_SIZE) {
      const batch = recentImages.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(recentImages.length / BATCH_SIZE);

      console.log(`\n📦 Batch ${batchNum}/${totalBatches} (${batch.length} images):`);

      for (const imagePath of batch) {
        try {
          // Get relative path from ghost-images folder
          const relativePath = path.relative(GHOST_IMAGES_PATH, imagePath);
          const ghostUrl = `${GHOST_URL}/content/images/${relativePath}`;

          // Skip if already uploaded
          if (urlMapping.has(ghostUrl)) {
            skipped++;
            console.log(`  ⊘ Skipped (already uploaded): ${relativePath}`);
            continue;
          }

          // Check file size
          const stats = fs.statSync(imagePath);
          const fileSizeMB = stats.size / (1024 * 1024);
          if (fileSizeMB > 10) {
            console.log(`  ⊘ Skipped (too large: ${fileSizeMB.toFixed(2)}MB): ${relativePath}`);
            skipped++;
            continue;
          }

          // Create form data for upload
          const formData = new FormData();
          formData.append('files', fs.createReadStream(imagePath), {
            filename: path.basename(imagePath),
            contentType: `image/${path.extname(imagePath).substring(1)}`
          });

          // Upload to Strapi
          const uploadResponse = await apiRequest('/api/upload', 'POST', formData);

          if (uploadResponse && uploadResponse[0]) {
            const strapiUrl = uploadResponse[0].url;
            urlMapping.set(ghostUrl, strapiUrl);
            uploaded++;
            console.log(`  ✓ Uploaded: ${relativePath}`);
          }
        } catch (error) {
          console.error(`  ✗ Failed: ${path.basename(imagePath)} - ${error.message}`);
          failed++;
        }
      }

      // Save mapping after each batch
      const mappingObj = Object.fromEntries(urlMapping);
      fs.writeFileSync(mappingFile, JSON.stringify(mappingObj, null, 2));

      // Delay between batches to avoid overwhelming the server
      if (i + BATCH_SIZE < recentImages.length) {
        await sleep(DELAY_BETWEEN_BATCHES);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n✅ Upload complete!`);
    console.log(`   Uploaded: ${uploaded}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Failed: ${failed}`);
    console.log(`\n📝 URL mapping saved to image-url-mapping.json`);

    // Now update all posts with new URLs
    if (uploaded > 0) {
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
    }

  } catch (error) {
    console.error('\nFatal error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
migrateImages().catch(error => {
  console.error('Failed to run migration:', error);
  process.exit(1);
});
