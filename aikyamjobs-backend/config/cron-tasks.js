module.exports = {
  /**
   * Cron job to check and unpublish expired jobs daily at midnight
   * Runs every day at 00:00 (midnight)
   */
  '0 0 * * *': async ({ strapi }) => {
    strapi.log.info('Running daily job expiration check...');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Find all published jobs with deadline that has passed
      const expiredJobs = await strapi.db.query('api::job.job').findMany({
        where: {
          publishedAt: { $notNull: true },
          deadline: { $lt: today },
        },
      });

      if (expiredJobs.length > 0) {
        // Unpublish all expired jobs
        for (const job of expiredJobs) {
          await strapi.db.query('api::job.job').update({
            where: { id: job.id },
            data: { publishedAt: null },
          });
        }

        strapi.log.info(`✅ Auto-unpublished ${expiredJobs.length} expired job(s)`);
      } else {
        strapi.log.info('✅ No expired jobs found');
      }
    } catch (error) {
      strapi.log.error('❌ Error in daily job expiration check:', error);
    }
  },
};
