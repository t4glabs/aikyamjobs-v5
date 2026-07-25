module.exports = {
  /**
   * Stamps unpublishedAt the moment a job transitions from published to
   * draft — whether that's a manual unpublish in the admin panel or the
   * cron's auto-expiry (config/cron-tasks.js). Only reacts to writes that
   * are already happening; does not decide to unpublish anything itself.
   * (A prior version of this file made that decision on every read, which
   * raced the cron and left jobs untagged — see project history.)
   */
  async beforeUpdate(event) {
    const { params } = event;
    const { data, where } = params;

    if (!data || !Object.prototype.hasOwnProperty.call(data, 'publishedAt')) {
      return;
    }

    const existing = await strapi.db.query('api::job.job').findOne({
      where,
      select: ['id', 'publishedAt'],
    });

    if (!existing) {
      return;
    }

    const wasPublished = existing.publishedAt !== null;
    const willBePublished = data.publishedAt !== null;

    if (wasPublished && !willBePublished) {
      data.unpublishedAt = new Date();
    } else if (!wasPublished && willBePublished) {
      // Republished — reset the follow-up clock for next time
      data.unpublishedAt = null;
      data.lastFollowUpAt = null;
    }
  },
};
