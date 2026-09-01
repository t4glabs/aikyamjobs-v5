const { notifyJobPublished } = require('../../../../telegram/bot');
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

/**
 * Rollout safety guard: a job may only be flipped to applyMode "gated" if it
 * has at least one requirementChecklist item. This is what stops the new
 * "Apply through aikyam" button from ever appearing on a JD the team hasn't
 * prepped. Runs on both create and update; on partial updates it backfills the
 * missing side (mode or checklist) from the stored row before deciding.
 */
async function assertGatedHasChecklist(event) {
  const { data, where } = event.params || {};
  if (!data) return;

  const modeInData = Object.prototype.hasOwnProperty.call(data, 'applyMode');
  const listInData = Object.prototype.hasOwnProperty.call(data, 'requirementChecklist');
  if (!modeInData && !listInData) return;

  let applyMode = modeInData ? data.applyMode : undefined;
  let checklist = listInData ? data.requirementChecklist : undefined;

  if ((applyMode === undefined || checklist === undefined) && where) {
    const existing = await strapi.db.query('api::job.job').findOne({
      where,
      populate: { requirementChecklist: true },
    });
    if (existing) {
      if (applyMode === undefined) applyMode = existing.applyMode;
      if (checklist === undefined) checklist = existing.requirementChecklist;
    }
  }

  if (applyMode === 'gated') {
    const count = Array.isArray(checklist) ? checklist.length : 0;
    if (count === 0) {
      throw new ApplicationError(
        'This job is set to "gated" apply mode but has no requirement checklist. Add at least one checklist item before switching to gated.'
      );
    }
  }
}

module.exports = {
  async beforeCreate(event) {
    await assertGatedHasChecklist(event);
  },

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
    await assertGatedHasChecklist(event);

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
