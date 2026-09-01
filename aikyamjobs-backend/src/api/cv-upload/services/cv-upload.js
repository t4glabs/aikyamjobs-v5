'use strict';

const { createCoreService } = require('@strapi/strapi').factories;
const { errors } = require('@strapi/utils');
const { ApplicationError } = errors;

module.exports = createCoreService('api::cv-upload.cv-upload', ({ strapi }) => ({
  /**
   * Records a CV upload for an applicant, enforcing the site-configurable rules:
   *
   *   - A re-upload within `cvUploadMinGapHours` of the last *counted* upload is
   *     treated as a CORRECTION (fixing a mistake): it replaces the file on the
   *     existing record and does NOT increment the count. The uploadedAt anchor
   *     is preserved so someone can't reset the clock by re-uploading forever.
   *   - Otherwise it's a DISTINCT upload: capped at `maxCvUploadsPer6Months`
   *     counted uploads within the trailing `cvUploadWindowDays`.
   *
   * Always repoints applicant.currentCv at the resulting record.
   */
  async recordUpload(applicantId, file) {
    const settings =
      (await strapi.entityService.findMany('api::site-setting.site-setting')) || {};
    const maxN = settings.maxCvUploadsPer6Months || 3;
    const minGapHours =
      settings.cvUploadMinGapHours != null ? settings.cvUploadMinGapHours : 24;
    const windowDays = settings.cvUploadWindowDays || 180;

    const now = Date.now();
    const minGapMs = minGapHours * 3600 * 1000;
    const windowMs = windowDays * 24 * 3600 * 1000;

    const uploadService = strapi.plugin('upload').service('upload');

    const [latestCounted] = await strapi.entityService.findMany(
      'api::cv-upload.cv-upload',
      {
        filters: { applicant: applicantId, counted: true },
        sort: { uploadedAt: 'desc' },
        populate: { file: true },
        limit: 1,
      }
    );

    const isCorrection =
      latestCounted &&
      now - new Date(latestCounted.uploadedAt).getTime() < minGapMs;

    // Enforce the distinct-upload limit BEFORE storing the file, so a rejected
    // attempt never leaves an orphan in /uploads.
    if (!isCorrection) {
      const countedInWindow = await strapi.entityService.count(
        'api::cv-upload.cv-upload',
        {
          filters: {
            applicant: applicantId,
            counted: true,
            uploadedAt: { $gt: new Date(now - windowMs) },
          },
        }
      );
      if (countedInWindow >= maxN) {
        const months = Math.round(windowDays / 30);
        throw new ApplicationError(
          `You've reached the limit of ${maxN} CV updates in the last ${months} months. Your latest CV stays on file — please try again later.`
        );
      }
    }

    const uploaded = await uploadService.upload({ data: {}, files: file });
    const media = Array.isArray(uploaded) ? uploaded[0] : uploaded;

    let record;
    if (isCorrection) {
      if (latestCounted.file && latestCounted.file.id) {
        await uploadService.remove(latestCounted.file).catch(() => {});
      }
      record = await strapi.entityService.update(
        'api::cv-upload.cv-upload',
        latestCounted.id,
        { data: { file: media.id, originalName: media.name }, populate: { file: true } }
      );
    } else {
      record = await strapi.entityService.create('api::cv-upload.cv-upload', {
        data: {
          applicant: applicantId,
          file: media.id,
          originalName: media.name,
          uploadedAt: new Date(),
          counted: true,
        },
        populate: { file: true },
      });
    }

    await strapi.entityService.update('api::applicant.applicant', applicantId, {
      data: { currentCv: record.id },
    });

    const countedInWindow = await strapi.entityService.count(
      'api::cv-upload.cv-upload',
      {
        filters: {
          applicant: applicantId,
          counted: true,
          uploadedAt: { $gt: new Date(now - windowMs) },
        },
      }
    );

    return {
      cvUpload: {
        id: record.id,
        originalName: record.originalName || media.name,
        uploadedAt: record.uploadedAt,
        url: record.file && record.file.url ? record.file.url : media.url,
      },
      counted: !isCorrection,
      countedInWindow,
      remaining: Math.max(0, maxN - countedInWindow),
    };
  },
}));
