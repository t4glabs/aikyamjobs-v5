'use strict';

const { notifyJobPublished } = require('../telegram/bot');
const { regenerateJobMindmap, removeUnreferencedPdfs } = require('../utils/mindmapPdf');
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
 * NOT regenerate the PDF, since the draft isn't public yet; publish
 * (including a republish after such an edit) always does.
 *
 * Everything that must be part of the published version (the fresh PDF, the
 * unpublishedAt/lastFollowUpAt reset) is written to the *draft before*
 * publish runs, so publish itself carries it across. Writing it afterwards
 * left the draft newer than the published row (the admin showed the job as
 * "Modified"), needed a second synthetic publish to sync, and meant the
 * admin's publish response never included the new PDF.
 */
const notifyInBackground = (strapi, documentId) => {
  // Not awaited: a slow Telegram API must never hold up the editor's publish.
  notifyJobPublished(documentId).catch((err) => strapi.log.error('[telegram-bot] notifyJobPublished failed', err));
};

module.exports = (strapi) => {
  strapi.documents.use(async (ctx, next) => {
    if (ctx.uid !== UID) return next();

    if (ctx.action === 'create' || ctx.action === 'update') {
      await assertGatedHasChecklist(ctx);

      // create/update with status "published" (an API client publishing in
      // one call) publishes *inside* the Document Service, without going
      // through this middleware's 'publish' action -- mirror its side
      // effects here so those jobs get a PDF and a Telegram post too.
      if (ctx.params?.status !== 'published') return next();
      const existingDocumentId = ctx.params.documentId;
      const wasPublished = existingDocumentId
        ? await strapi.documents(UID).findOne({ documentId: existingDocumentId, status: 'published', fields: ['id'] })
        : null;
      const result = await next();
      const documentId = result?.documentId || existingDocumentId;
      if (documentId) {
        await regenerateJobMindmap(strapi, documentId, { source: 'published' }).catch((err) =>
          strapi.log.error('[mindmap] regenerateJobMindmap failed', err)
        );
        if (!wasPublished) notifyInBackground(strapi, documentId);
      }
      return result;
    }

    if (ctx.action === 'publish') {
      const { documentId } = ctx.params;
      const previouslyPublished = await strapi.documents(UID).findOne({ documentId, status: 'published', fields: ['id'] });

      await strapi.documents(UID).update({ documentId, data: { unpublishedAt: null, lastFollowUpAt: null } });
      const pdf = await regenerateJobMindmap(strapi, documentId, { source: 'draft' }).catch((err) => {
        strapi.log.error('[mindmap] regenerateJobMindmap failed', err);
        return null;
      });

      const result = await next();

      // The replaced published row is gone now, so the previous PDF file
      // is unreferenced and can go.
      if (pdf?.previousIds?.length) await removeUnreferencedPdfs(strapi, pdf.previousIds);
      if (!previouslyPublished) notifyInBackground(strapi, documentId);
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
