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

module.exports = { resolveApplyMode, hasChecklist, scoreChecklist };
