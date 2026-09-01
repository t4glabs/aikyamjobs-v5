'use strict';

/**
 * Dev-only helper: creates (or refreshes) one published GATED job with a
 * requirement checklist so the gated apply flow can be tested end-to-end
 * locally. Safe to re-run. Run with the dev server stopped:
 *
 *   node scripts/seed-apply-test.js
 */
const strapiFactory = require('@strapi/strapi');

const SLUG = 'gated-test-role';

(async () => {
  // Hard guard: this publishes jobs, which on a real instance would fire the
  // Telegram job-announcement to the live channel. Never allow it on the VPS.
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'seed-apply-test is a LOCAL dev helper and refuses to run with NODE_ENV=production.'
    );
    process.exit(1);
  }

  const app = await strapiFactory().load();
  try {
    const checklist = [
      { label: 'I have 2+ years of experience in the social impact sector', required: true, weight: 3 },
      { label: 'I am based in or willing to relocate to Bhopal', required: true, weight: 2 },
      { label: 'I have experience writing grant proposals', required: false, weight: 2 },
      { label: 'I am fluent in Hindi and English', required: false, weight: 1 },
    ];

    const existing = await app.db
      .query('api::job.job')
      .findOne({ where: { slug: SLUG } });

    const data = {
      title: 'Gated Test Role (Program Manager)',
      slug: SLUG,
      description: 'A seeded job for testing the gated aikyam application flow.',
      applyMode: 'gated',
      applicationUrl: 'https://real-ngo.example.org/secret-apply-form',
      requirementChecklist: checklist,
      publishedAt: new Date(),
    };

    let job;
    if (existing) {
      job = await app.entityService.update('api::job.job', existing.id, { data });
      console.log('Updated existing gated test job:', job.id);
    } else {
      job = await app.entityService.create('api::job.job', { data });
      console.log('Created gated test job:', job.id);
    }
    console.log(JSON.stringify({ id: job.id, slug: job.slug, applyMode: job.applyMode }, null, 2));

    // Also a published EXTERNAL job (old flow) so the normal "Apply now" button
    // can be seen locally next to the gated one.
    const EXT_SLUG = 'external-test-role';
    const extData = {
      title: 'External Test Role (old Apply now button)',
      slug: EXT_SLUG,
      description: 'A seeded job that uses the old external apply button.',
      applyMode: 'external',
      applicationUrl: 'https://example.org/apply-here',
      publishedAt: new Date(),
    };
    const extExisting = await app.db.query('api::job.job').findOne({ where: { slug: EXT_SLUG } });
    const extJob = extExisting
      ? await app.entityService.update('api::job.job', extExisting.id, { data: extData })
      : await app.entityService.create('api::job.job', { data: extData });
    console.log('External test job:', extJob.id, extJob.slug);
  } catch (err) {
    console.error('SEED_ERROR', err);
    process.exitCode = 1;
  } finally {
    await app.destroy();
    process.exit(process.exitCode || 0);
  }
})();
