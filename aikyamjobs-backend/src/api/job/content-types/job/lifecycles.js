// Flag to prevent infinite recursion
let isCheckingExpiredJobs = false;

module.exports = {
  /**
   * Check and unpublish expired jobs on every find operation
   */
  async beforeFindMany(event) {
    if (!isCheckingExpiredJobs) {
      await checkAndUnpublishExpiredJobs();
    }
  },

  async beforeFindOne(event) {
    if (!isCheckingExpiredJobs) {
      await checkAndUnpublishExpiredJobs();
    }
  },
};

/**
 * Function to check and unpublish jobs that have passed their deadline
 */
async function checkAndUnpublishExpiredJobs() {
  if (isCheckingExpiredJobs) return;

  isCheckingExpiredJobs = true;
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of today

  try {
    // Find all published jobs with a closingDate that has passed
    const expiredJobs = await strapi.db.query('api::job.job').findMany({
      where: {
        publishedAt: { $notNull: true }, // Only published jobs
        closingDate: { $lt: today },
      },
    });

    if (expiredJobs.length > 0) {
      // Unpublish each expired job
      for (const job of expiredJobs) {
        await strapi.db.query('api::job.job').update({
          where: { id: job.id },
          data: { publishedAt: null },
        });

        strapi.log.info(`Auto-unpublished expired job: ${job.title} (ID: ${job.id})`);
      }

      strapi.log.info(`Total jobs auto-unpublished: ${expiredJobs.length}`);
    }
  } catch (error) {
    strapi.log.error('Error checking expired jobs:', error.message);
  } finally {
    isCheckingExpiredJobs = false;
  }
}
