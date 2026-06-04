# Automatic Job Expiration Feature

## Overview

The aikyam jobs platform automatically unpublishes job postings when they pass their deadline. Expired jobs are moved to draft status and no longer appear on the website.

## How It Works

### 1. **Lifecycle Hooks (Real-time)**
When someone visits the website, the system checks for expired jobs before loading the data:
- Runs on every job query (findMany, findOne)
- Finds jobs with `deadline < today` that are still published
- Automatically unpublishes them by setting `publishedAt` to `null`
- Logs which jobs were unpublished

**File**: `src/api/job/content-types/job/lifecycles.js`

### 2. **Daily Cron Job (Scheduled)**
A scheduled task runs every day at midnight (00:00):
- Checks all published jobs
- Finds jobs past their deadline
- Unpublishes them automatically
- Logs the results

**File**: `config/cron-tasks.js`

**Schedule**: `0 0 * * *` (Every day at midnight)

## Configuration

### Enable/Disable Cron Jobs

Edit `config/server.js`:

```javascript
cron: {
  enabled: true, // Set to false to disable cron jobs
  tasks: require('./cron-tasks'),
}
```

### Change Cron Schedule

Edit `config/cron-tasks.js`:

```javascript
// Current: Daily at midnight
'0 0 * * *': async ({ strapi }) => { ... }

// Examples:
'0 */6 * * *'   // Every 6 hours
'0 0 * * 0'     // Every Sunday at midnight
'0 12 * * *'    // Daily at noon
```

## Usage in Strapi Admin

### Setting a Job Deadline

1. Go to **Content Manager** → **Job** → **Create/Edit**
2. Fill in all job details
3. Set the **Deadline** field to the last date for applications
4. Click **Save** and **Publish**

### What Happens to Expired Jobs

- **Automatically unpublished**: Moved to draft status
- **Not deleted**: Still available in Strapi admin
- **Can be republished**: If you extend the deadline and republish

### Finding Expired Jobs

In Strapi Admin:
1. Go to **Content Manager** → **Job**
2. Filter by **Status** → **Draft**
3. Check which ones were auto-unpublished (look for past deadlines)

### Republishing an Expired Job

1. Open the expired job in Strapi
2. Update the **Deadline** to a future date
3. Click **Publish**
4. Job will appear on the website again

## Logs

Check Strapi logs to see when jobs are unpublished:

```
[INFO] Auto-unpublished expired job: Software Engineer (ID: 123)
[INFO] Total jobs auto-unpublished: 5
[INFO] Running daily job expiration check...
[INFO] ✅ Auto-unpublished 3 expired job(s)
```

## Technical Details

### Database Query

```javascript
const expiredJobs = await strapi.db.query('api::job.job').findMany({
  where: {
    publishedAt: { $notNull: true },  // Only published jobs
    deadline: { $lt: today },          // Deadline before today
  },
});
```

### Unpublish Operation

```javascript
await strapi.db.query('api::job.job').update({
  where: { id: job.id },
  data: { publishedAt: null },  // Setting to null = draft status
});
```

## Benefits

✅ **Automatic cleanup**: No manual intervention needed
✅ **No stale jobs**: Website always shows current opportunities
✅ **Professional**: Applicants don't waste time on closed positions
✅ **Reversible**: Jobs aren't deleted, just unpublished
✅ **Logged**: Track what gets expired when

## Testing

### Test the Lifecycle Hook
1. Create a job with deadline yesterday
2. Publish it
3. Visit the website or API
4. Job should be automatically unpublished

### Test the Cron Job
1. Set a job deadline to yesterday
2. Restart Strapi
3. Wait for midnight (or change cron schedule for testing)
4. Check logs and job status

### Manual Test
```javascript
// In Strapi console or bootstrap
const today = new Date();
today.setHours(0, 0, 0, 0);

const expiredJobs = await strapi.db.query('api::job.job').findMany({
  where: {
    publishedAt: { $notNull: true },
    deadline: { $lt: today },
  },
});

console.log(`Found ${expiredJobs.length} expired jobs`);
```

## Troubleshooting

### Cron not running?
- Check if `cron.enabled: true` in `config/server.js`
- Check Strapi logs for cron job execution
- Verify server timezone matches expected schedule

### Jobs not unpublishing?
- Check if deadline is set correctly
- Verify job is published (not already draft)
- Check Strapi logs for errors
- Make sure lifecycle file exists

### Want to disable auto-expiration?
```javascript
// In config/server.js
cron: {
  enabled: false,  // Disable cron jobs
}

// Comment out or delete lifecycles.js to disable real-time checks
```

## Production Recommendations

1. **Set correct timezone** in your server
2. **Monitor logs** for any errors
3. **Notify admins** before unpublishing (optional enhancement)
4. **Regular backups** of database
5. **Test thoroughly** before production deployment

## Future Enhancements

- [ ] Email notification to job poster before expiration
- [ ] Grace period (unpublish N days after deadline)
- [ ] Auto-archive instead of unpublish
- [ ] Dashboard widget showing expiring jobs
- [ ] Bulk republish with new deadlines

---

**Note**: Jobs without a deadline will never auto-expire.
