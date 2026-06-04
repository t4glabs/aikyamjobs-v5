const  fs = require('fs');

// Read migration data
const migration = JSON.parse(fs.readFileSync('migration-processed.json', 'utf8'));

const jobsWithDates = migration.jobs.filter(j => j.closingDate || j.deadline);

console.log('Total jobs in migration:', migration.jobs.length);
console.log('Jobs with closing/deadline dates:', jobsWithDates.length);
console.log('\nSample jobs with dates:');

jobsWithDates.slice(0, 10).forEach(j => {
  console.log('Title:', j.title.substring(0, 60));
  console.log('Closing Date:', j.closingDate || 'N/A');
  console.log('Deadline:', j.deadline || 'N/A');
  console.log('Slug:', j.slug);
  console.log('---');
});

console.log(`\n\nTotal with dates: ${jobsWithDates.length}/${migration.jobs.length}`);
