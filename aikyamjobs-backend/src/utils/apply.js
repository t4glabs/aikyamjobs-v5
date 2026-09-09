'use strict';

/**
 * Single source of truth for "is this job on the old external button or the new
 * gated aikyam flow?" — used by the job controller (to strip the real URL and
 * expose resolvedApplyMode) and by the submit endpoint (to reject submissions
 * to jobs that aren't actually gated).
 *
 * Rules:
 *   - applyMode "external"        -> external (owner forced old behaviour)
 *   - applyMode "gated"           -> gated IF it has a checklist, else external
 *   - applyMode "auto" (default)  -> gated only when the site is flipped to
 *                                    "gatedEverywhere" AND the job has a
 *                                    checklist; otherwise external.
 *
 * A job with no checklist can NEVER resolve to gated. This is the guarantee the
 * Friday site-wide flip relies on: unprepped jobs stay on the external button.
 */
function hasChecklist(job) {
  return Array.isArray(job && job.requirementChecklist) && job.requirementChecklist.length > 0;
}

function resolveApplyMode(job, settings) {
  const globalMode = (settings && settings.globalApplyMode) || 'perJob';
  const mode = (job && job.applyMode) || 'auto';

  if (mode === 'external') return 'external';
  if (mode === 'gated') return hasChecklist(job) ? 'gated' : 'external';
  // auto
  if (globalMode === 'gatedEverywhere' && hasChecklist(job)) return 'gated';
  return 'external';
}

/**
 * Deterministic self-assessment score. `items` is the job's requirementChecklist
 * (each {label, required, weight}); `checked` is a parallel array of booleans
 * (same order/length) captured from the applicant. Returns a self-contained
 * snapshot so the Application keeps a faithful record even if the JD's checklist
 * is edited later. No AI involved.
 */
function scoreChecklist(items, checked) {
  const list = Array.isArray(items) ? items : [];
  const flags = Array.isArray(checked) ? checked : [];

  let score = 0;
  let max = 0;
  const snapshotItems = [];
  const requiredMissing = [];

  list.forEach((item, i) => {
    const weight = Number.isFinite(item.weight) && item.weight > 0 ? item.weight : 1;
    const isChecked = flags[i] === true;
    max += weight;
    if (isChecked) score += weight;
    if (item.required && !isChecked) requiredMissing.push(item.label);
    snapshotItems.push({
      label: item.label,
      required: !!item.required,
      weight,
      checked: isChecked,
    });
  });

  const percent = max > 0 ? Math.round((score / max) * 100) : 0;

  return { items: snapshotItems, score, max, percent, requiredMissing };
}

/**
 * Redacts applicationUrl/applicationEmail from a single Job API entry if it
 * resolves to gated, and stamps resolvedApplyMode. Mutates in place. Used by
 * the Job controller's own find/findOne, which always force-populates
 * requirementChecklist first (see addChecklistPopulate in job.js), so
 * resolveApplyMode always has what it needs here to tell gated from external
 * correctly.
 *
 * NOT reused for jobs reached via Company/Category's `jobs` relation — see
 * stripApplyContactFields below for why that needs a different, stricter
 * approach.
 */
function applyGateToJob(job, settings) {
  if (!job || !job.attributes) return;
  const a = job.attributes;
  const resolved = resolveApplyMode(a, settings);
  a.resolvedApplyMode = resolved;
  if (resolved === 'gated') {
    delete a.applicationUrl;
    delete a.applicationEmail;
  }
}

/**
 * Unconditionally strips applicationUrl/applicationEmail from a job entry
 * reached via a *nested* populate (Company.jobs, Category.jobs) — deliberately
 * NOT gated on resolveApplyMode here. Reason: resolveApplyMode needs
 * requirementChecklist to correctly tell gated from external, and nothing
 * forces that component to be populated when the client asks for
 * `?populate[jobs]=*` (Strapi's shallow `*` doesn't deep-populate a nested
 * relation's own components) — confirmed live that this silently fails OPEN
 * (looks un-gated, real URL leaks) rather than failing closed. Since neither
 * the companies pages nor the tag page ever read these two fields off a
 * nested job (they only link through to the job's own `/jobs/[slug]` page,
 * which has its own fully-populated, correctly-gated view), there's no
 * legitimate case where a nested job needs them — so just always remove them.
 */
function stripApplyContactFields(job) {
  if (!job || !job.attributes) return;
  delete job.attributes.applicationUrl;
  delete job.attributes.applicationEmail;
}

/**
 * Walks a populated `jobs` relation (array or single entry) under one or more
 * API entries and strips the sensitive fields from each. Safe no-op if `jobs`
 * wasn't populated at all.
 */
function gateNestedJobs(entryOrEntries) {
  const entries = Array.isArray(entryOrEntries) ? entryOrEntries : [entryOrEntries];
  for (const entry of entries) {
    const jobsData = entry && entry.attributes && entry.attributes.jobs && entry.attributes.jobs.data;
    if (Array.isArray(jobsData)) {
      jobsData.forEach((job) => stripApplyContactFields(job));
    } else if (jobsData && typeof jobsData === 'object') {
      stripApplyContactFields(jobsData);
    }
  }
}

module.exports = { resolveApplyMode, hasChecklist, scoreChecklist, applyGateToJob, gateNestedJobs };
