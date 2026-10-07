'use strict';

const fs = require('fs');
const path = require('path');
// v8's API is class-based (new ZipArchive(...)), not the older factory-
// function style (archiver('zip', ...)) that most existing tutorials show --
// confirmed by hand after the factory call threw "archiver is not a function".
const { ZipArchive } = require('archiver');

const STRAPI_PUBLIC_URL =
  process.env.STRAPI_PUBLIC_URL || process.env.PUBLIC_URL || 'http://localhost:1337';

function absoluteMediaUrl(url) {
  if (!url) return null;
  return url.startsWith('http') ? url : `${STRAPI_PUBLIC_URL}${url}`;
}

/**
 * Bulk CV export for candidate-sourcing work that's independent of any one
 * job/application — e.g. building a standalone "resourceful people" pool.
 * Scope is deliberately narrow: only applicants who've actually submitted a
 * job application or CV Improver request (real consent given at that point),
 * never a bare upload someone abandoned mid-flow. Each row is that person's
 * CURRENT CV (their freshest version), not whichever one a past application
 * happened to snapshot. No application/review data (scores, decisions, which
 * job) is included on purpose — this list is for a separate exercise.
 *
 * Shared by both the JSON listing (cvExport) and the zip download
 * (cvExportZip) below, so the two can never drift on who's actually included.
 */
async function findExportCandidates(since) {
  const applicants = await strapi.entityService.findMany('api::applicant.applicant', {
    filters: {
      currentCv: { id: { $notNull: true } },
      $or: [{ applications: { id: { $notNull: true } } }, { cvReviews: { id: { $notNull: true } } }],
    },
    populate: {
      currentCv: { populate: { file: true } },
      applications: { fields: ['submittedAt'] },
      cvReviews: { fields: ['submittedAt'] },
    },
    limit: -1,
  });

  return applicants
    .map((a) => {
      const dates = [
        ...(a.applications || []).map((x) => x.submittedAt),
        ...(a.cvReviews || []).map((x) => x.submittedAt),
      ]
        .filter(Boolean)
        .map((d) => new Date(d));
      const lastActivityAt = dates.length ? new Date(Math.max(...dates)) : null;
      return { a, lastActivityAt };
    })
    .filter(({ lastActivityAt }) => !since || (lastActivityAt && lastActivityAt >= since))
    .sort((x, y) => (y.lastActivityAt || 0) - (x.lastActivityAt || 0));
}

// A readable, collision-safe entry name inside the zip -- name (or email if
// no name on file) plus the applicant id, so two "Priya S" never collide and
// whoever opens the zip can tell whose CV is whose without opening each one.
function zipEntryName(applicant, ext) {
  const base = (applicant.name || applicant.email || 'applicant')
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return `${base}-${applicant.id}${ext || ''}`;
}

module.exports = {
  async cvExport(ctx) {
    const since = ctx.query.since ? new Date(ctx.query.since) : null;
    const candidates = await findExportCandidates(since);

    ctx.body = {
      count: candidates.length,
      candidates: candidates.map(({ a, lastActivityAt }) => ({
        applicantId: a.id,
        name: a.name || null,
        email: a.email,
        phone: a.phone || null,
        cvOriginalName: a.currentCv?.originalName || null,
        cvUrl: absoluteMediaUrl(a.currentCv?.file?.url),
        lastActivityAt,
      })),
    };
  },

  /**
   * Same scope as cvExport, but streams the actual CV files bundled into one
   * .zip rather than a list of links -- built for "give me everyone's CV in
   * one download" rather than "give me a list I click through one at a
   * time." Only works with the local upload provider (reads files straight
   * off disk via the same path convention Strapi's own local provider uses:
   * strapi.dirs.static.public + file.url) -- if this project ever moves to
   * S3/Cloudinary/etc, this needs to fetch over HTTP instead of reading a
   * local path.
   *
   * Streamed directly to the response (never buffers the whole zip in
   * memory) so this stays cheap as the candidate pool grows. A CV that's
   * missing on disk is skipped with a warning rather than failing the whole
   * export -- one bad file shouldn't block everyone else's.
   */
  async cvExportZip(ctx) {
    const since = ctx.query.since ? new Date(ctx.query.since) : null;
    const candidates = await findExportCandidates(since);

    const dateStamp = new Date().toISOString().slice(0, 10);
    ctx.status = 200;
    ctx.set('Content-Type', 'application/zip');
    ctx.set('Content-Disposition', `attachment; filename="aikyamjobs-cvs-${dateStamp}.zip"`);

    const archive = new ZipArchive({ zlib: { level: 9 } });

    let included = 0;
    for (const { a } of candidates) {
      const fileUrl = a.currentCv?.file?.url;
      if (!fileUrl) continue;

      const localPath = path.join(strapi.dirs.static.public, fileUrl);
      if (!fs.existsSync(localPath)) {
        strapi.log.warn(`[cv-export] applicant ${a.id}: CV file missing on disk at ${localPath} — skipped`);
        continue;
      }

      archive.file(localPath, { name: zipEntryName(a, path.extname(fileUrl)) });
      included += 1;
    }

    strapi.log.info(`[cv-export] zip export: ${included} of ${candidates.length} candidates included`);

    // ctx.body isn't used here -- Koa's own response layer (as wrapped by
    // Strapi's middleware) doesn't recognize ZipArchive as a pipeable stream
    // and tries to JSON.stringify it instead, which throws on its internal
    // circular structure (confirmed by hand). ctx.respond = false hands the
    // raw response over so the archive can be piped directly, the
    // well-established Koa pattern for streaming a response body it doesn't
    // natively understand.
    ctx.respond = false;
    archive.pipe(ctx.res);

    await new Promise((resolve, reject) => {
      ctx.res.on('finish', resolve);
      ctx.res.on('close', resolve);
      archive.on('error', reject);
      archive.finalize();
    });
  },
};
