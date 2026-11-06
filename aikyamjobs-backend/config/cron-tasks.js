/**
 * Attach an internal tag to the DRAFT row of a document.
 *
 * Strapi 5 keeps a published document as two rows (draft + published) and
 * unpublish() deletes the published one. Tagging the published row -- what
 * this cron did under v4's single-row model -- means the tag is deleted along
 * with it, so it has to go on the draft row, which is what remains.
 */
async function tagDraftRow(strapi, uid, documentId, tagId) {
  const draft = await strapi.db.query(uid).findOne({
    where: { documentId, publishedAt: null },
    select: ['id'],
  });
  if (!draft) throw new Error(`no draft row for document ${documentId}`);

  await strapi.db.query(uid).update({
    where: { id: draft.id },
    data: { internalTags: { connect: [tagId] } },
  });
}

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
      // Look up the expired-job internal tag by exact name
      const expiredTag = await strapi.db.query('api::internal-tag.internal-tag').findOne({
        where: { name: 'expired-job' },
      });

      if (!expiredTag) {
        strapi.log.warn('expired-job internal tag not found — jobs will be unpublished but not tagged.');
      } else {
        strapi.log.info(`Found internal tag: "${expiredTag.name}" (ID: ${expiredTag.id})`);
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
          // Step 1: add the expired-job tag to the draft row (survives the unpublish)
          if (expiredTag) {
            await tagDraftRow(strapi, 'api::job.job', job.documentId, expiredTag.id);
          }

          // Step 2: unpublish (set to draft)
          await strapi.documents('api::job.job').unpublish({
            documentId: job.documentId,
          });

          strapi.log.info(`Auto-unpublished expired job: ${job.title} (ID: ${job.id})${expiredTag ? ' + tagged expired-job' : ''}`);
          unpublished++;
        } catch (jobError) {
          strapi.log.error(`Failed to process job ID ${job.id}: ${jobError.message}`);
        }
      }

      strapi.log.info(`Total jobs auto-unpublished: ${unpublished}`);
    } catch (error) {
      strapi.log.error('Error in daily job expiration check:', error);
    }
  },

  /**
   * Course counterpart of the job check above, as a separate named task so a
   * failure in one never blocks the other. Runs daily at midnight (server
   * time): finds published courses whose applicationDeadline has passed,
   * tags them 'expired-course' and unpublishes them.
   *
   * applicationDeadline is a date-only field ('YYYY-MM-DD'), so the course
   * stays live for the whole deadline day and is pulled at the first midnight
   * after it -- same semantics as jobs.
   */
  expireCourses: {
    task: async ({ strapi }) => {
      strapi.log.info('Running daily course application-deadline check...');

      // Today's date in server-local time, as 'YYYY-MM-DD' to match the
      // date column. Deadlines strictly before today are expired.
      const now = new Date();
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');

      try {
        // Created on first use so there's no manual admin step on deploy.
        let expiredTag = await strapi.db.query('api::internal-tag.internal-tag').findOne({
          where: { name: 'expired-course' },
        });
        if (!expiredTag) {
          expiredTag = await strapi.db.query('api::internal-tag.internal-tag').create({
            data: {
              name: 'expired-course',
              description: 'Auto-applied when a course is unpublished because its application deadline passed.',
            },
          });
          strapi.log.info(`Created internal tag "expired-course" (ID: ${expiredTag.id})`);
        }

        const expiredCourses = await strapi.db.query('api::course.course').findMany({
          where: {
            publishedAt: { $notNull: true },
            applicationDeadline: { $notNull: true, $lt: today },
          },
        });

        if (expiredCourses.length === 0) {
          strapi.log.info('No expired courses found.');
          return;
        }

        let unpublished = 0;

        for (const course of expiredCourses) {
          try {
            // Step 1: tag the draft row (survives the unpublish)
            await tagDraftRow(strapi, 'api::course.course', course.documentId, expiredTag.id);

            // Step 2: unpublish (set to draft)
            await strapi.documents('api::course.course').unpublish({
              documentId: course.documentId,
            });

            strapi.log.info(`Auto-unpublished expired course: ${course.title} (ID: ${course.id}) + tagged expired-course`);
            unpublished++;
          } catch (courseError) {
            strapi.log.error(`Failed to process course ID ${course.id}: ${courseError.message}`);
          }
        }

        strapi.log.info(`Total courses auto-unpublished: ${unpublished}`);
      } catch (error) {
        strapi.log.error('Error in daily course expiration check:', error);
      }
    },
    options: {
      rule: '0 0 * * *',
    },
  },
};
