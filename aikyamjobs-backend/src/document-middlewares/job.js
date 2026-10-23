'use strict';

const { notifyJobPublished } = require('../telegram/bot');
const { regenerateJobMindmap } = require('../utils/mindmapPdf');
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

const UID = 'api::job.job';

/**
 * Rollout safety guard: a job may only be flipped to applyMode "gated" if it
 * has at least one requirementChecklist item. This is what stops the new
 * "Apply through aikyam" button from ever appearing on a JD the team hasn't
 * prepped. Runs on both create and update; on partial updates it backfills the
 * missing side (mode or checklist) from the stored draft before deciding.
 */
async function assertGatedHasChecklist(ctx) {
  const { data, documentId } = ctx.params || {};
  if (!data) return;

  const modeInData = Object.prototype.hasOwnProperty.call(data, 'applyMode');
  const listInData = Object.prototype.hasOwnProperty.call(data, 'requirementChecklist');
  if (!modeInData && !listInData) return;

  let applyMode = modeInData ? data.applyMode : undefined;
  let checklist = listInData ? data.requirementChecklist : undefined;

  if ((applyMode === undefined || checklist === undefined) && documentId) {
    const existing = await strapi.documents(UID).findOne({
      documentId,
      fields: ['applyMode'],
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

/**
 * Registered as a global Document Service middleware (src/index.js's
 * register()) rather than a per-content-type lifecycles.js -- Strapi 5
 * removed the old auto-wired lifecycles.js mechanism in favour of this.
 *
 * Draft & Publish means "publish" is now its own action distinct from
 * "update" (v4 inferred a publish transition from a plain update's
 * publishedAt field; v5 has a dedicated action for it), so the
 * Telegram-notify + mindmap-regen side effects that used to live in
 * afterUpdate/afterCreate now hang off the publish action instead -- the
 * only moment a job's content actually becomes the live, public version.
 * Editing mindmapJson via a plain Save (without Publish) intentionally does
 * NOT regenerate the PDF anymore, since the draft isn't public yet; publish
 * (including a republish after such an edit) always does.
 */
// `update()` only ever writes the draft -- the only way to push a computed
// field (the regenerated PDF) onto the published row is to update the draft
// then republish. That republish re-enters this same middleware's `publish`
// branch, so this guards against regenerating a second time for that inner,
// synthetic publish.
const republishingForMindmap = new Set();

module.exports = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== UID) return next();

    if (ctx.action === 'create' || ctx.action === 'update') {
      await assertGatedHasChecklist(ctx);
      return next();
    }

    if (ctx.action === 'publish') {
      if (republishingForMindmap.has(ctx.params.documentId)) {
        return next();
      }

      const previouslyPublished = await strapi
        .documents(UID)
        .findOne({ documentId: ctx.params.documentId, status: 'published', fields: ['id'] });

      const result = await next();

      await strapi.documents(UID).update({
        documentId: ctx.params.documentId,
        data: { unpublishedAt: null, lastFollowUpAt: null },
      });

      if (!previouslyPublished) {
        await notifyJobPublished(ctx.params.documentId).catch((err) =>
          strapi.log.error('[telegram-bot] notifyJobPublished failed', err)
        );
      }

      const regenerated = await regenerateJobMindmap(strapi, ctx.params.documentId).catch((err) => {
        strapi.log.error('[mindmap] regenerateJobMindmap failed', err);
        return false;
      });

      if (regenerated) {
        republishingForMindmap.add(ctx.params.documentId);
        try {
          await strapi.documents(UID).publish({ documentId: ctx.params.documentId });
        } catch (err) {
          strapi.log.error('[mindmap] republish after regeneration failed', err);
        } finally {
          republishingForMindmap.delete(ctx.params.documentId);
        }
      }

      return result;
    }

    if (ctx.action === 'unpublish') {
      const result = await next();

      await strapi.documents(UID).update({
        documentId: ctx.params.documentId,
        data: { unpublishedAt: new Date() },
      });

      return result;
    }

    return next();
  });
};
