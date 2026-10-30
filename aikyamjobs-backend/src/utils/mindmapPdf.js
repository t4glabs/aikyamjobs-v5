'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { NodeCompiler } = require('@myriaddreamin/typst-ts-node-compiler');
const { resolveApplyMode } = require('./apply');
const { markdownToBlocks } = require('./markdownBlocks');
const { getSiteSettings } = require('./siteSettings');
const { toPublicTree, pickInitiatives } = require('./mindmapTree');

const UID = 'api::job.job';
const WORKSPACE = __dirname;
const TEMPLATE_PATH = path.join(WORKSPACE, 'mindmap-template.typ');
const DATA_SHADOW_PATH = path.join(WORKSPACE, 'mindmap-data.json');
// Figtree (the site's typeface, OFL -- see fonts/OFL.txt), converted from
// the frontend's @fontsource/figtree WOFF files. Typst's own embedded fonts
// are serif/mono only.
const FONT_DIR = path.join(WORKSPACE, 'fonts');
const SITE_URL = process.env.SITE_URL || 'http://localhost:3001';

function formatDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

/**
 * Same "is this the real applicationUrl/Email, or the gated Application
 * Assist flow?" decision the job controller and JD page already make --
 * reused verbatim rather than re-derived, so this PDF can never end up
 * leaking a gated job's real apply target (the exact class of bug the
 * gating feature exists to prevent). Mirrors the sidebar CTA copy on
 * app/jobs/[slug]/page.tsx exactly ("Application Assist" / "Apply now" /
 * "Apply via email").
 */
function resolveApplyCta(job, settings) {
  const resolved = resolveApplyMode(job, settings);
  if (resolved === 'gated') {
    return { label: 'Application Assist', href: `${SITE_URL}/jobs/${job.slug}/apply` };
  }
  if (job.applicationUrl) return { label: 'Apply now', href: job.applicationUrl };
  if (job.applicationEmail) return { label: 'Apply via email', href: `mailto:${job.applicationEmail}` };
  return null;
}

// Job.skills entries are plain strings today and may become ESCO-shaped
// objects later (see the frontend's lib/skills.ts) -- the PDF only needs
// the names either way.
function skillLabels(skills) {
  if (!Array.isArray(skills)) return [];
  return skills
    .map((s) => (typeof s === 'string' ? s : s && typeof s.label === 'string' ? s.label : ''))
    .map((s) => s.trim())
    .filter(Boolean);
}

function withScheme(url) {
  if (!url || typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url) ? url : `https://${url}`;
}

function buildJobSection(job, settings, company) {
  return {
    title: job.title,
    url: job.slug ? `${SITE_URL}/jobs/${job.slug}` : null,
    companyName: company?.name || null,
    location: job.location || null,
    jobType: job.jobType || null,
    experienceLevel: job.experienceLevel || null,
    salary: job.salary || null,
    closingDate: formatDate(job.closingDate),
    skills: skillLabels(job.skills),
    descriptionBlocks: markdownToBlocks(job.description),
    apply: resolveApplyCta(job, settings),
  };
}

function buildCompanySection(company) {
  if (!company) return null;
  return {
    name: company.name,
    url: company.slug ? `${SITE_URL}/companies/${company.slug}` : null,
    location: company.location || null,
    size: company.size || null,
    industry: company.industry || null,
    website: withScheme(company.website),
    descriptionBlocks: markdownToBlocks(company.description),
  };
}

/**
 * Renders the "JD as a PDF" document (see mindmap-template.typ for the
 * layout). Compiles a fresh in-process compiler per call (~20ms) with the
 * data injected as an in-memory shadow file -- never writes to disk, so
 * concurrent calls can't collide on a shared temp path.
 */
function generateMindmapPdf({ jobMap, job, company, companyInitiatives, brandColor }) {
  const compiler = NodeCompiler.create({ workspace: WORKSPACE, fontArgs: [{ fontPaths: [FONT_DIR] }] });
  try {
    const shadowData = {
      meta: { brandColor: brandColor || '#AE4634' },
      job,
      jobMap: jobMap || null,
      company: company || null,
      companyInitiatives: companyInitiatives && companyInitiatives.length ? companyInitiatives : null,
    };
    compiler.mapShadow(DATA_SHADOW_PATH, Buffer.from(JSON.stringify(shadowData)));
    const pdf = compiler.pdf({ mainFilePath: TEMPLATE_PATH });
    if (!pdf) throw new Error('Typst compilation produced no output');
    return Buffer.from(pdf);
  } finally {
    compiler.evictCache(0);
  }
}

/**
 * Generates the PDF and uploads it into Strapi's media library via the
 * upload plugin's own service (the same one CV uploads go through). The
 * upload service reads from a real file path, so the in-memory buffer is
 * written to a uniquely-named temp file just for the upload call, then
 * removed regardless of outcome.
 */
async function uploadMindmapPdf(strapi, { slug, ...rest }) {
  const buffer = generateMindmapPdf(rest);
  const tmpPath = path.join(os.tmpdir(), `mindmap-${crypto.randomUUID()}.pdf`);
  fs.writeFileSync(tmpPath, buffer);

  try {
    const [uploaded] = await strapi.plugin('upload').service('upload').upload({
      data: {},
      files: {
        // Strapi 5's upload service (enhanceAndValidateFile in
        // @strapi/upload) reads `filepath`/`originalFilename`/`mimetype` off
        // the file object -- not v4's `path`/`name`/`type`. Without a real
        // `mimetype` it falls back to "application/octet-stream", which our
        // own upload-mime-allowlist.js then rejects.
        filepath: tmpPath,
        originalFilename: `${slug || 'job'}-mindmap.pdf`,
        mimetype: 'application/pdf',
        size: buffer.length,
      },
    });
    return uploaded;
  } finally {
    fs.rm(tmpPath, { force: true }, () => {});
  }
}

/**
 * Deletes old PDF files once no job row points at them any more. Checked
 * per file rather than assumed: during a publish the old published row
 * still references the previous PDF until the publish itself completes.
 */
async function removeUnreferencedPdfs(strapi, fileIds) {
  for (const id of new Set(fileIds || [])) {
    try {
      const file = await strapi.db.query('plugin::upload.file').findOne({ where: { id }, populate: { related: true } });
      if (!file) continue;
      if (Array.isArray(file.related) && file.related.length > 0) continue;
      await strapi.plugin('upload').service('upload').remove(file);
    } catch (err) {
      strapi.log.error(`[mindmap] failed to remove old PDF file ${id}`, err);
    }
  }
}

/**
 * Generate -> upload -> attach for one job. Never throws on a Typst/upload
 * failure (logs and returns null) -- a PDF problem must never block saving
 * or publishing the job itself.
 *
 * `source` decides which version the PDF is built from and where it lands:
 *   - 'draft'      the publish hook, called *before* publish runs: the draft
 *                  is exactly what's about to go live. The PDF is attached
 *                  to the draft row only and publish carries it onto the
 *                  published row (so the admin's publish response already
 *                  shows it). Old files are returned, not deleted -- the old
 *                  published row still uses them until publish completes;
 *                  the caller removes them afterwards.
 *   - 'published'  out-of-band refreshes (company side panel, API publishes):
 *                  built from the live version and attached directly to
 *                  every row of the document, draft and published, with no
 *                  republish -- so unrelated unpublished draft edits are
 *                  never pushed live, and the live PDF is never left
 *                  pointing at a deleted file. Old files are removed here.
 *
 * Only the JOB's own mindmap gates whether a PDF is built at all; the
 * company section is included whenever the job's company is published.
 */
/**
 * Everything generateMindmapPdf() needs for one job, read from the given
 * version (falling back to the draft when a 'published' read finds none,
 * i.e. a job that was never published). Null when there's no usable job
 * mindmap. Separate from the upload so a dry run can render to a file.
 */
async function loadPdfInput(strapi, documentId, source) {
  const populate = { requirementChecklist: true, categories: { fields: ['name'] }, company: true };
  // No `fields` allowlist: mindmapJson is `private: true`, and Strapi 5's
  // Document Service rejects selecting a private field via `fields`, even
  // for internal server-side calls.
  let status = source;
  let job = await strapi.documents(UID).findOne({ documentId, status, populate });
  if (!job && source === 'published') {
    status = 'draft';
    job = await strapi.documents(UID).findOne({ documentId, status, populate });
  }
  if (!job) {
    strapi.log.warn(`[mindmap] job ${documentId} not found (${source}) — skipping PDF`);
    return null;
  }

  const jobMap = toPublicTree(job.mindmapJson);
  if (!jobMap) {
    strapi.log.info(
      `[mindmap] job ${documentId} (${job.slug}) ` +
        (job.mindmapJson ? "has a mindmapJson that isn't a usable tree (needs a root with label/title/topic and children)" : 'has no mindmapJson') +
        ' — no PDF'
    );
    return null;
  }

  // Always the *published* company -- what the site shows. The populated
  // relation on a draft job would be the company's draft instead.
  let company = null;
  if (job.company && job.company.documentId) {
    company = await strapi.documents('api::company.company').findOne({ documentId: job.company.documentId, status: 'published' });
  }
  const companyTree = company ? toPublicTree(company.mindmapJson) : null;
  const companyInitiatives = companyTree ? pickInitiatives(companyTree) : [];

  const settings = await getSiteSettings(strapi);
  return {
    job,
    status,
    company,
    input: {
      jobMap,
      job: buildJobSection(job, settings, company),
      company: buildCompanySection(company),
      companyInitiatives,
      brandColor: settings?.primaryColor,
    },
  };
}

async function regenerateJobMindmap(strapi, documentId, { source = 'published' } = {}) {
  const loaded = await loadPdfInput(strapi, documentId, source);
  if (!loaded) return null;
  const { job, status, company, input } = loaded;
  const companyInitiatives = input.companyInitiatives;

  let uploaded;
  try {
    uploaded = await uploadMindmapPdf(strapi, { slug: job.slug, ...input });
  } catch (err) {
    strapi.log.error(`[mindmap] job ${documentId} (${job.slug}) PDF generation/upload failed`, err);
    return null;
  }

  const attachToDraftOnly = source === 'draft' || status === 'draft';
  const rows = await strapi.db.query(UID).findMany({
    where: { documentId, ...(attachToDraftOnly ? { publishedAt: null } : {}) },
    populate: { mindmapPdf: true },
  });
  const previousIds = rows.map((r) => r.mindmapPdf && r.mindmapPdf.id).filter((id) => id && id !== uploaded.id);
  for (const row of rows) {
    await strapi.db.query(UID).update({ where: { id: row.id }, data: { mindmapPdf: uploaded.id } });
  }

  strapi.log.info(
    `[mindmap] job ${documentId} (${job.slug}) new PDF ${uploaded.id} from ${status}, attached to ${rows.length} row(s)` +
      (company ? ` — company "${company.name}"${companyInitiatives.length ? ` + ${companyInitiatives.length} initiatives` : ''}` : ' — no published company')
  );

  if (source !== 'draft') await removeUnreferencedPdfs(strapi, previousIds);
  return { uploadedId: uploaded.id, previousIds };
}

module.exports = { generateMindmapPdf, loadPdfInput, regenerateJobMindmap, removeUnreferencedPdfs };
