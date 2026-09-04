'use strict';

/**
 * Direct test of the application-review plugin's controller logic — calls
 * the real decide()/findOne() functions (not a reimplementation) against a
 * fresh, fully-controlled test application, and hand-verifies the resulting
 * scores. Run with the dev server stopped.
 *
 *   node scripts/test-application-review.js
 */
const strapiFactory = require('@strapi/strapi');
const assert = require('assert');

function fakeCtx({ params = {}, body = {}, adminEmail = 'test-admin@local.dev', adminFirstname = 'Test' } = {}) {
  const ctx = {
    params,
    query: {},
    request: { body },
    state: { user: { email: adminEmail, firstname: adminFirstname } },
    body: undefined,
    notFound() {
      ctx.body = { error: 'not found' };
      ctx._notFound = true;
    },
    badRequest(msg) {
      ctx.body = { error: msg };
      ctx._badRequest = true;
    },
  };
  return ctx;
}

(async () => {
  const app = await strapiFactory().load();
  const originalSettings = await app.entityService.findMany('api::site-setting.site-setting');
  const originalAutoSend = originalSettings.autoSendDecisionEmails;

  try {
    const review = require('../src/plugins/application-review/server/controllers/review');

    // ── Set up: a fresh test applicant + application against gated-test-role ──
    const job = await app.db.query('api::job.job').findOne({ where: { slug: 'gated-test-role' } });
    assert(job, 'gated-test-role job not found — run seed-apply-test.js first');
    const fullJob = await app.entityService.findOne('api::job.job', job.id, {
      populate: { requirementChecklist: true },
    });
    console.log(`Job checklist (${fullJob.requirementChecklist.length} items):`);
    fullJob.requirementChecklist.forEach((i, idx) =>
      console.log(`  [${idx}] ${i.label} (w${i.weight}${i.required ? ', required' : ''})`)
    );

    const testEmail = `review-test-${Date.now()}@example.com`;
    const applicant = await app.entityService.create('api::applicant.applicant', {
      data: { email: testEmail, name: 'Review Test' },
    });

    const cvUpload = await app.entityService.create('api::cv-upload.cv-upload', {
      data: { applicant: applicant.id, originalName: 'test.pdf', uploadedAt: new Date(), counted: true },
    });

    // Applicant self-ticks: item 0 + item 1 only -> 3+2=5 / 8 = 62.5% -> rounds to 63
    const applicantChecked = [true, true, false, false];
    const { scoreChecklist } = require('../src/utils/apply');
    const applicantSnapshot = scoreChecklist(fullJob.requirementChecklist, applicantChecked);

    const application = await app.entityService.create('api::application.application', {
      data: {
        applicant: applicant.id,
        job: job.id,
        status: 'submitted',
        checklistAnswers: applicantSnapshot,
        checklistScore: applicantSnapshot.score,
        checklistMax: applicantSnapshot.max,
        checklistPercent: applicantSnapshot.percent,
        consent: true,
        cvUsed: cvUpload.id,
        submittedAt: new Date(),
      },
    });
    console.log(`\nCreated test application #${application.id}`);
    console.log(
      `  applicant self-score: ${applicantSnapshot.score}/${applicantSnapshot.max} = ${applicantSnapshot.percent}% (expect 5/8=63%)`
    );
    assert.strictEqual(applicantSnapshot.score, 5);
    assert.strictEqual(applicantSnapshot.max, 8);
    assert.strictEqual(applicantSnapshot.percent, 63);
    console.log('  ✓ applicant score matches hand-calculation');

    // ── Test 1: findOne() before decision — must NOT leak per-item applicant answers ──
    const ctx1 = fakeCtx({ params: { id: application.id } });
    await review.findOne(ctx1);
    assert.strictEqual(ctx1.body.applicantChecklist.items, null, 'per-item answers leaked before decision!');
    assert.strictEqual(ctx1.body.applicantChecklist.percent, 63, 'aggregate percent should still be visible');
    assert.strictEqual(ctx1.body.decision, null);
    console.log('\n✓ findOne() before decision: per-item answers hidden, aggregate % visible, decision null');

    // ── Test 2: applicantAnswers() reveal endpoint works ──
    const ctx2 = fakeCtx({ params: { id: application.id } });
    await review.applicantAnswers(ctx2);
    assert.strictEqual(ctx2.body.items.length, 4);
    assert.strictEqual(ctx2.body.items[0].checked, true);
    assert.strictEqual(ctx2.body.items[2].checked, false);
    console.log('✓ applicantAnswers() reveal returns correct per-item detail');

    // ── Test 3: decide() with autoSendDecisionEmails OFF (the default) ──
    await app.entityService.update('api::site-setting.site-setting', 1, {
      data: { autoSendDecisionEmails: false },
    });

    // Reviewer ticks: items 0,1,2 (found grant-writing evidence applicant didn't
    // claim) -> 3+2+2=7 / 8 = 87.5% -> rounds to 88
    const reviewerChecked = [true, true, true, false];
    const ctx3 = fakeCtx({
      params: { id: application.id },
      body: {
        reviewerChecked,
        leadWithThese: 'Grant-writing experience is clearly there even though not explicitly claimed.',
        fixBeforeSending: 'Add explicit years of social-impact experience up front.',
        decision: 'approved',
      },
    });
    await review.decide(ctx3);
    console.log(`\nDecide (auto-send OFF) response:`, JSON.stringify(ctx3.body));
    assert.strictEqual(ctx3.body.reviewerScore, 7);
    assert.strictEqual(ctx3.body.reviewerMax, 8);
    assert.strictEqual(ctx3.body.reviewerPercent, 88);
    assert.strictEqual(ctx3.body.emailSent, false, 'email should NOT send when autoSendDecisionEmails is off');
    assert.strictEqual(ctx3.body.autoSendEnabled, false);
    console.log('✓ reviewer score = 7/8 = 88% (hand-calc matches), email correctly NOT sent (setting off)');

    const persisted = await app.entityService.findOne('api::application.application', application.id);
    assert.strictEqual(persisted.status, 'approved');
    assert.strictEqual(persisted.reviewerScore, 7);
    assert.strictEqual(persisted.decisionByAdminEmail, 'test-admin@local.dev');
    assert.strictEqual(persisted.decisionEmailSent, false);
    assert(persisted.decisionAt, 'decisionAt should be set');
    console.log('✓ persisted record matches: status=approved, decisionByAdminEmail recorded, decisionAt set');

    // ── Test 4: findOne() AFTER decision — per-item comparison now visible ──
    const ctx4 = fakeCtx({ params: { id: application.id } });
    await review.findOne(ctx4);
    assert(ctx4.body.applicantChecklist.items, 'per-item answers should be visible after decision');
    assert.strictEqual(ctx4.body.decision.reviewerPercent, 88);
    console.log('✓ findOne() after decision: per-item comparison now visible, reviewer decision included');

    // ── Test 5: decide() with autoSendDecisionEmails ON, safe throwaway email ──
    await app.entityService.update('api::site-setting.site-setting', 1, {
      data: { autoSendDecisionEmails: true },
    });
    // A second application record for the same applicant/job — the submit
    // controller normally enforces one-per-job dedupe, but that check lives in
    // application.js's HTTP handler, not a DB constraint, so creating a second
    // row directly via entityService (bypassing that controller) is fine here.
    const app2 = await app.entityService.create('api::application.application', {
      data: {
        applicant: applicant.id,
        job: job.id,
        status: 'submitted',
        checklistAnswers: applicantSnapshot,
        checklistScore: applicantSnapshot.score,
        checklistMax: applicantSnapshot.max,
        checklistPercent: applicantSnapshot.percent,
        consent: true,
        cvUsed: cvUpload.id,
        submittedAt: new Date(),
      },
    });

    const ctx5 = fakeCtx({
      params: { id: app2.id },
      body: {
        reviewerChecked: [false, false, false, false],
        leadWithThese: '',
        fixBeforeSending: 'Nothing on the page shows relevant experience yet.',
        decision: 'rejected_with_tips',
      },
    });
    await review.decide(ctx5);
    console.log(`\nDecide (auto-send ON, throwaway email) response:`, JSON.stringify(ctx5.body));
    assert.strictEqual(ctx5.body.autoSendEnabled, true);
    console.log(`✓ autoSendEnabled correctly reflects the site setting`);
    console.log(
      ctx5.body.emailSent
        ? '✓ email send attempted (check Mailgun / server log for delivery)'
        : 'ⓘ email send was attempted but failed — check server log (mailer no-ops gracefully without creds)'
    );

    console.log('\n✅ ALL ASSERTIONS PASSED');
  } catch (err) {
    console.error('\n❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    // Always restore the safe default regardless of pass/fail.
    await app.entityService.update('api::site-setting.site-setting', 1, {
      data: { autoSendDecisionEmails: originalAutoSend },
    });
    console.log(`\n(restored autoSendDecisionEmails to ${originalAutoSend})`);
    await app.destroy();
  }
})();
