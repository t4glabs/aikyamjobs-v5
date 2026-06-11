module.exports = {
  /**
   * Runs daily at midnight (server time).
   * Finds all published jobs whose closingDate has passed,
   * unpublishes them, and applies the 'expired-job' internal tag.
   */
  '0 0 * * *': async ({ strapi }) => {
    strapi.log.info('Running daily job expiration check...');

    // Midnight today — jobs closing yesterday or earlier get unpublished.
    // Jobs closing today remain published until tomorrow's run.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      // Look up the expired-job internal tag once
      const expiredTag = await strapi.db.query('api::internal-tag.internal-tag').findOne({
        where: { name: 'expired-job' },
      });

      if (!expiredTag) {
        strapi.log.warn('expired-job internal tag not found — jobs will be unpublished but not tagged. Create it in Settings → Internal Tags.');
      }

      // Find all published jobs with a closingDate in the past
      const expiredJobs = await strapi.db.query('api::job.job').findMany({
        where: {
          publishedAt: { $notNull: true },
          closingDate: { $notNull: true, $lt: today },
        },
      });

      if (expiredJobs.length === 0) {
        strapi.log.info('No expired jobs found.');
        return;
      }

      let unpublished = 0;

      for (const job of expiredJobs) {
        try {
          await strapi.entityService.update('api::job.job', job.id, {
            data: {
              publishedAt: null,
              ...(expiredTag && {
                internalTags: { connect: [{ id: expiredTag.id }] },
              }),
            },
          });

          strapi.log.info(`Auto-unpublished expired job: ${job.title} (ID: ${job.id})`);
          unpublished++;
        } catch (jobError) {
          strapi.log.error(`Failed to unpublish job ID ${job.id}: ${jobError.message}`);
        }
      }

      strapi.log.info(`Total jobs auto-unpublished: ${unpublished}`);
    } catch (error) {
      strapi.log.error('Error in daily job expiration check:', error);
    }
  },
};
