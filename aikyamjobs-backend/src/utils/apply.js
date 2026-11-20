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
  if (!job) return;
  const resolved = resolveApplyMode(job, settings);
  job.resolvedApplyMode = resolved;
  if (resolved === 'gated') {
    delete job.applicationUrl;
    delete job.applicationEmail;
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
  if (!job) return;
  delete job.applicationUrl;
  delete job.applicationEmail;
}

// Relation keys that point at api::job.job anywhere in the schema
// (Company.jobs, Category.jobs, SavedJob.job, Application.job).
const JOB_RELATION_KEYS = new Set(['jobs', 'job']);

/**
 * Walks an API response at ANY depth and strips the sensitive fields from
 * every job reached through a `jobs`/`job` relation. The entries passed in
 * are never stripped themselves, only what's nested under them, so it is
 * safe to call on the Job controller's own top-level results (those are
 * gated properly by applyGateToJob instead).
 *
 * It has to be recursive: the frontend's own job query
 * (`populate[company][populate]=*`) returned Job -> company -> jobs, and a
 * crafted populate can nest further (Company -> jobs -> categories -> jobs).
 * A one-level check missed the first and leaked 33 of 35 gated jobs' real
 * URLs on 2026-11-20. Response trees from Strapi have no cycles, so plain
 * recursion is fine.
 */
function gateNestedJobs(entryOrEntries) {
  const walk = (value, underJobRelation) => {
    if (Array.isArray(value)) {
      value.forEach((item) => walk(item, underJobRelation));
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (underJobRelation) stripApplyContactFields(value);
    for (const [key, child] of Object.entries(value)) {
      if (child && typeof child === 'object') walk(child, JOB_RELATION_KEYS.has(key));
    }
  };
  walk(entryOrEntries, false);
}

const APPLY_CONTACT_FIELDS = ['applicationUrl', 'applicationEmail'];

function mentionsApplyContactField(value) {
  if (value == null) return false;
  if (typeof value === 'string') return APPLY_CONTACT_FIELDS.some((f) => value.includes(f));
  if (Array.isArray(value)) return value.some(mentionsApplyContactField);
  if (typeof value === 'object') {
    return Object.entries(value).some(
      ([key, child]) => APPLY_CONTACT_FIELDS.includes(key) || mentionsApplyContactField(child)
    );
  }
  return false;
}

/**
 * True when a parsed query (`ctx.query`) could be used as a yes/no oracle on
 * applicationUrl / applicationEmail: filtering or sorting on them (top level
 * or inside a populate, e.g. `filters[jobs][applicationUrl][$startsWith]=`),
 * or `_q` full-text search, which also matches inside those two fields. Any
 * of these spells out a gated job's hidden URL one character at a time even
 * though the field is stripped from the response (all confirmed locally
 * 2026-11-20).
 *
 * Selecting them with `fields[]` is deliberately still allowed: gated values
 * are stripped from the output anyway, and KyaAI's dead-link checker selects
 * applicationUrl that way. Nothing (site, KyaAI, search indexer) filters,
 * sorts or `_q`-searches on these fields.
 */
function isApplyContactOracleQuery(query) {
  if (!query || typeof query !== 'object') return false;
  if (query._q !== undefined) return true;
  if (mentionsApplyContactField(query.filters) || mentionsApplyContactField(query.sort)) return true;
  const populateProbes = (p) => {
    if (!p || typeof p !== 'object') return false;
    if (Array.isArray(p)) return p.some(populateProbes);
    return Object.entries(p).some(([key, child]) =>
      key === 'filters' || key === 'sort' ? mentionsApplyContactField(child) : populateProbes(child)
    );
  };
  return populateProbes(query.populate);
}

module.exports = {
  resolveApplyMode,
  hasChecklist,
  scoreChecklist,
  applyGateToJob,
  gateNestedJobs,
  isApplyContactOracleQuery,
};
