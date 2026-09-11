'use strict';

/**
 * Marking/unmarking a "star candidate" lives on the Applicant, not on any
 * one Application or CV Review — the whole point is that whoever reviews
 * this person NEXT, on a completely unrelated job or CV Improver request,
 * sees it. Shared by both Detail screens (Application Review and CV
 * Improver) since a star could be spotted from either flow.
 *
 * Tracks who marked it via the admin's own email (ctx.state.user.email),
 * same convention as decisionByAdminEmail elsewhere in this codebase — the
 * `staff` content type has no reliable link back to a logged-in Strapi admin
 * user, so this project already tracks "who did this" as a plain email
 * string rather than a staff relation.
 */
module.exports = {
  async setStar(ctx) {
    const { isStarCandidate, note } = ctx.request.body || {};

    if (isStarCandidate && (!note || !note.trim())) {
      return ctx.badRequest('A short note on why they stand out is required to mark someone as a star candidate.');
    }

    const applicant = await strapi.entityService.findOne('api::applicant.applicant', ctx.params.id);
    if (!applicant) return ctx.notFound();

    const updated = await strapi.entityService.update('api::applicant.applicant', applicant.id, {
      data: {
        isStarCandidate: !!isStarCandidate,
        ...(isStarCandidate
          ? {
              starCandidateNote: note.trim(),
              starCandidateMarkedByAdminEmail: ctx.state.user?.email || null,
              starCandidateMarkedAt: new Date(),
            }
          : {}),
      },
    });

    ctx.body = {
      ok: true,
      isStarCandidate: updated.isStarCandidate,
      starCandidateNote: updated.starCandidateNote,
      starCandidateMarkedByAdminEmail: updated.starCandidateMarkedByAdminEmail,
      starCandidateMarkedAt: updated.starCandidateMarkedAt,
    };
  },
};
