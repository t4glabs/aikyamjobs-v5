const { notifyJobPublished } = require('../../../../telegram/bot');
const { regenerateJobMindmap } = require('../../../../utils/mindmapPdf');
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

    event.state = event.state || {};
    event.state.mindmapJsonInPayload =
      !!data && Object.prototype.hasOwnProperty.call(data, 'mindmapJson');

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

    // Regenerate when either (a) this specific update actually touched
    // mindmapJson on a job that's already/still live, or (b) the job just
    // transitioned draft -> published and already had mindmapJson saved
    // from an earlier draft edit -- Strapi's admin UI always does "Save"
    // and "Publish" as two separate calls, so mindmapJson is essentially
    // never part of the same update payload as the publish transition.
    const shouldRegenerate =
      (event.state?.mindmapJsonInPayload && event.result.publishedAt) ||
      (event.state?.justPublished && event.result.mindmapJson);
    if (shouldRegenerate) {
      strapi.log.info(
        `[mindmap] job ${event.result.id} update triggered regeneration (mindmapJsonInPayload=${!!event.state?.mindmapJsonInPayload}, justPublished=${!!event.state?.justPublished}, publishedAt=${!!event.result.publishedAt})`
      );
      await regenerateJobMindmap(strapi, event.result.id).catch((err) =>
        strapi.log.error('[mindmap] regenerateJobMindmap failed', err)
      );
    } else if (event.state?.mindmapJsonInPayload) {
      // mindmapJson was part of this save, but the conditions above decided
      // not to regenerate -- almost always because the row being written
      // here is a draft (publishedAt still null), which is expected and not
      // an error: publishing separately afterwards is what actually
      // triggers generation in that case.
      strapi.log.info(
        `[mindmap] job ${event.result.id} saved mindmapJson but did not regenerate (publishedAt=${!!event.result.publishedAt}) — publish the job to generate the PDF`
      );
    }
  },

  async afterCreate(event) {
    if (event.result.publishedAt) {
      await notifyJobPublished(event.result.id).catch((err) =>
        strapi.log.error('[telegram-bot] notifyJobPublished failed', err)
      );
    }

    if (event.result.publishedAt && event.result.mindmapJson) {
      await regenerateJobMindmap(strapi, event.result.id).catch((err) =>
        strapi.log.error('[mindmap] regenerateJobMindmap failed', err)
      );
    }
  },
};
