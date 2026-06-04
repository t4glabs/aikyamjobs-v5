const fs = require('fs');
const path = require('path');
const TurndownService = require('turndown');

// This script converts HTML content to Markdown for better editing in Strapi
// Usage: STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js

const STRAPI_API_URL = process.env.STRAPI_API_URL || 'http://localhost:1337/api';
const API_TOKEN = process.env.STRAPI_API_TOKEN;
const GHOST_URL = 'https://aikyamjobs.org';

// Configure Turndown for better conversion
const turndownService = new TurndownService({
  headingStyle: 'atx',
  hr: '---',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
  emDelimiter: '_',
});

// Add rule for iframes (YouTube embeds, etc.)
turndownService.addRule('iframe', {
  filter: 'iframe',
  replacement: function (content, node) {
    const src = node.getAttribute('src') || '';
    if (src.includes('youtube.com') || src.includes('youtu.be')) {
      return `\n\n[YouTube Video](${src})\n\n`;
    }
    return `\n\n[Embedded Content](${src})\n\n`;
  }
});

// Add rule for figure with iframe (Ghost style embeds)
turndownService.addRule('figure-iframe', {
  filter: function (node) {
    return node.nodeName === 'FIGURE' && node.querySelector('iframe');
  },
  replacement: function (content, node) {
    const iframe = node.querySelector('iframe');
    if (iframe) {
      const src = iframe.getAttribute('src') || '';
      if (src.includes('youtube.com') || src.includes('youtu.be')) {
        return `\n\n[YouTube Video](${src})\n\n`;
      }
      return `\n\n[Embedded Content](${src})\n\n`;
    }
    return content;
  }
});

async function convertHtmlToMarkdown() {
  if (!API_TOKEN) {
    console.log('\n⚠️  No API token provided!');
    console.log('\nRun this script with: STRAPI_API_TOKEN=your_token node scripts/convert-html-to-markdown.js\n');
    return;
  }

  try {
    console.log('Starting HTML to Markdown conversion...\n');

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

    // Convert Jobs
    console.log('Converting Jobs...');
    const jobsResponse = await apiRequest('/jobs?pagination[pageSize]=200');
    const jobs = jobsResponse.data;

    let jobsConverted = 0;
    let jobsSkipped = 0;

    for (const job of jobs) {
      try {
        // Convert if htmlContent exists
        if (job.attributes.htmlContent) {

          // Replace __GHOST_URL__ with actual Ghost URL
          let htmlContent = job.attributes.htmlContent.replace(/__GHOST_URL__/g, GHOST_URL);

          const markdown = turndownService.turndown(htmlContent);

          await apiRequest(`/jobs/${job.id}`, 'PUT', {
            data: {
              description: markdown
            }
          });

          jobsConverted++;
          console.log(`  ✓ Converted job: ${job.attributes.title}`);
        } else {
          jobsSkipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error converting job ${job.attributes.title}:`, error.message);
      }
    }

    console.log(`\nJobs: ${jobsConverted} converted, ${jobsSkipped} skipped`);

    // Convert Companies
    console.log('\nConverting Companies...');
    const companiesResponse = await apiRequest('/companies?pagination[pageSize]=200');
    const companies = companiesResponse.data;

    let companiesConverted = 0;
    let companiesSkipped = 0;

    for (const company of companies) {
      try {
        // Convert if htmlContent exists
        if (company.attributes.htmlContent) {

          // Replace __GHOST_URL__ with actual Ghost URL
          let htmlContent = company.attributes.htmlContent.replace(/__GHOST_URL__/g, GHOST_URL);

          const markdown = turndownService.turndown(htmlContent);

          await apiRequest(`/companies/${company.id}`, 'PUT', {
            data: {
              description: markdown
            }
          });

          companiesConverted++;
          console.log(`  ✓ Converted company: ${company.attributes.name}`);
        } else {
          companiesSkipped++;
        }
      } catch (error) {
        console.error(`  ✗ Error converting company ${company.attributes.name}:`, error.message);
      }
    }

    console.log(`\nCompanies: ${companiesConverted} converted, ${companiesSkipped} skipped`);

    console.log('\n' + '='.repeat(60));
    console.log('✅ Conversion completed!');
    console.log('='.repeat(60));
    console.log(`\nSummary:`);
    console.log(`  Jobs converted:       ${jobsConverted}`);
    console.log(`  Companies converted:  ${companiesConverted}`);
    console.log(`  Total converted:      ${jobsConverted + companiesConverted}`);
    console.log('='.repeat(60));
    console.log('\n💡 Now you can edit all content in Markdown format in Strapi!');

  } catch (error) {
    console.error('Fatal error during conversion:', error);
  }
}

// Run the conversion
convertHtmlToMarkdown().catch(error => {
  console.error('Failed to run conversion:', error);
  process.exit(1);
});
