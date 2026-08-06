const { notifyJobPublished } = require('../../../../telegram/bot');

module.exports = {
  /**
   * Stamps unpublishedAt the moment a job transitions from published to
   * draft — whether that's a manual unpublish in the admin panel or the
   * cron's auto-expiry (config/cron-tasks.js). Only reacts to writes that
   * are already happening; does not decide to unpublish anything itself.
   * (A prior version of this file made that decision on every read, which
   * raced the cron and left jobs untagged — see project history.)
   *
   * Also records the publish transition on event.state so afterUpdate can
   * fire the Telegram notification without re-querying for the same
   * before/after comparison — one source of truth for the transition.
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

    event.state = event.state || {};
    event.state.justPublished = !wasPublished && willBePublished;
  },

  async afterUpdate(event) {
    if (event.state?.justPublished) {
      await notifyJobPublished(event.result.id).catch((err) =>
        strapi.log.error('[telegram-bot] notifyJobPublished failed', err)
      );
    }
  },

  async afterCreate(event) {
    if (event.result.publishedAt) {
      await notifyJobPublished(event.result.id).catch((err) =>
        strapi.log.error('[telegram-bot] notifyJobPublished failed', err)
      );
    }
  },
};
