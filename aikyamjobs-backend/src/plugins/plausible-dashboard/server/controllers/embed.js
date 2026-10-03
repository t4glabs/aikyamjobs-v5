'use strict';

/**
 * Hands back the Plausible shared-dashboard embed URL for the admin panel to
 * drop into an <iframe>. The share-link auth token lives only in the backend
 * .env and is never sent to the browser except through this authenticated
 * admin-only route -- baking it directly into the admin page's own code
 * would ship it inside the admin JS bundle, readable by anyone who finds
 * that bundle URL, auth or not.
 *
 * Defaults to a 28-day period rather than "All time": confirmed by hand
 * that the Goal Conversions panel on this self-hosted instance throws an
 * internal server error on the "All time" range (likely a CE performance
 * limit with this many goals over a long history) -- 28 days loads fine and
 * is what currently gets requested from the admin page.
 */
module.exports = {
  async find(ctx) {
    const baseUrl = process.env.PLAUSIBLE_SHARE_BASE_URL;
    const authToken = process.env.PLAUSIBLE_SHARE_AUTH_TOKEN;

    if (!baseUrl || !authToken) {
      return ctx.badRequest(
        'Plausible embed is not configured. Set PLAUSIBLE_SHARE_BASE_URL and PLAUSIBLE_SHARE_AUTH_TOKEN in the backend .env.'
      );
    }

    const period = ['day', '7d', '28d', '91d', 'month', '6mo', '12mo'].includes(ctx.query.period)
      ? ctx.query.period
      : '28d';

    const url = new URL(baseUrl);
    url.searchParams.set('auth', authToken);
    url.searchParams.set('period', period);

    ctx.body = { url: url.toString() };
  },
};
