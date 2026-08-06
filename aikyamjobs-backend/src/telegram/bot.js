'use strict';

const { Bot, InlineKeyboard } = require('grammy');

let bot = null;

function isEnabled() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

function getBot() {
  if (!bot) {
    bot = new Bot(process.env.TELEGRAM_BOT_TOKEN);
  }
  return bot;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

// Deep-link payload from a channel post's subscribe button, e.g. "cats-12-45"
function parseCategoryPayload(payload) {
  if (!payload.startsWith('cats-')) return [];
  return payload
    .slice(5)
    .split('-')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
}

async function findOrCreateSubscriber(chatId, from) {
  const existing = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findOne({
    where: { chatId },
    populate: ['categories'],
  });

  if (existing) {
    await strapi.entityService.update('api::telegram-subscriber.telegram-subscriber', existing.id, {
      data: {
        username: from?.username || null,
        firstName: from?.first_name || null,
      },
    });
    return existing;
  }

  const created = await strapi.entityService.create('api::telegram-subscriber.telegram-subscriber', {
    data: {
      chatId,
      username: from?.username || null,
      firstName: from?.first_name || null,
      categories: [],
    },
  });
  return { ...created, categories: [] };
}

async function buildCategoryKeyboard(chatId, restrictToIds) {
  const categories = await strapi.db.query('api::category.category').findMany({
    select: ['id', 'name'],
    ...(restrictToIds?.length ? { where: { id: { $in: restrictToIds } } } : {}),
    orderBy: { name: 'asc' },
  });

  const subscriber = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findOne({
    where: { chatId },
    populate: ['categories'],
  });

  const subscribedIds = new Set((subscriber?.categories || []).map((c) => c.id));

  const keyboard = new InlineKeyboard();
  categories.forEach((category, index) => {
    const checked = subscribedIds.has(category.id) ? '✅ ' : '';
    keyboard.text(`${checked}${category.name}`, `toggle:${category.id}`);
    if (index % 2 === 1) keyboard.row();
  });

  return keyboard;
}

async function toggleSubscription(chatId, from, categoryId) {
  const subscriber = await findOrCreateSubscriber(chatId, from);
  const currentIds = (subscriber.categories || []).map((c) => c.id);
  const isSubscribed = currentIds.includes(categoryId);
  const nextIds = isSubscribed
    ? currentIds.filter((id) => id !== categoryId)
    : [...currentIds, categoryId];

  await strapi.entityService.update('api::telegram-subscriber.telegram-subscriber', subscriber.id, {
    data: { categories: nextIds },
  });

  return !isSubscribed;
}

function registerHandlers(botInstance, strapiInstance) {
  botInstance.command('start', async (ctx) => {
    const chatId = String(ctx.chat.id);
    await findOrCreateSubscriber(chatId, ctx.from);

    const categoryIds = parseCategoryPayload(ctx.match || '');
    if (categoryIds.length > 0) {
      const keyboard = await buildCategoryKeyboard(chatId, categoryIds);
      await ctx.reply('Want alerts for jobs like this one? Tap a category to subscribe:', {
        reply_markup: keyboard,
      });
      return;
    }

    await ctx.reply(
      '👋 Welcome to aikyamjobs Job Alerts!\n\n' +
        'Head over to the channel for the latest postings: https://t.me/aikyamjobs\n\n' +
        'To get notified about a specific type of role, tap "🔔 Get alerts for jobs like this" under any job post in the channel — or use /subscriptions anytime to manage what you\'re subscribed to.'
    );
  });

  botInstance.command('subscriptions', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const subscriber = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findOne({
      where: { chatId },
      populate: ['categories'],
    });
    const names = (subscriber?.categories || []).map((c) => c.name);
    const summary = names.length
      ? `You're currently subscribed to:\n${names.map((n) => `• ${n}`).join('\n')}`
      : "You're not subscribed to any categories yet.";
    const keyboard = await buildCategoryKeyboard(chatId);
    await ctx.reply(`${summary}\n\nTap below to add or remove:`, { reply_markup: keyboard });
  });

  botInstance.callbackQuery(/^toggle:(\d+)$/, async (ctx) => {
    const categoryId = Number(ctx.match[1]);
    const chatId = String(ctx.chat.id);
    const subscribed = await toggleSubscription(chatId, ctx.from, categoryId);
    await ctx.answerCallbackQuery({ text: subscribed ? 'Subscribed ✅' : 'Unsubscribed' });
    const keyboard = await buildCategoryKeyboard(chatId);
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
  });

  botInstance.catch((err) => {
    strapiInstance.log.error('[telegram-bot] handler error', err);
  });
}

async function startBot(strapiInstance) {
  if (!isEnabled()) {
    strapiInstance.log.warn('[telegram-bot] TELEGRAM_BOT_TOKEN not set — bot disabled');
    return;
  }

  const botInstance = getBot();
  registerHandlers(botInstance, strapiInstance);

  await botInstance.api
    .setMyCommands([
      { command: 'start', description: 'Get started / manage your alerts' },
      { command: 'subscriptions', description: 'View or edit your subscribed categories' },
    ])
    .catch((err) => strapiInstance.log.warn('[telegram-bot] setMyCommands failed', err));

  botInstance
    .start({
      onStart: () => strapiInstance.log.info('[telegram-bot] started (long polling)'),
    })
    .catch((err) => strapiInstance.log.error('[telegram-bot] polling stopped with error', err));

  const shutdown = () => botInstance.stop();
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

async function stopBot() {
  if (bot) {
    await bot.stop();
  }
}

async function notifyJobPublished(jobId) {
  if (!isEnabled()) return;

  const channel = process.env.TELEGRAM_CHANNEL_USERNAME;
  if (!channel) {
    strapi.log.warn('[telegram-bot] TELEGRAM_CHANNEL_USERNAME not set — skipping channel post');
    return;
  }

  const job = await strapi.entityService.findOne('api::job.job', jobId, {
    populate: ['company', 'categories'],
  });

  if (!job || !job.publishedAt) return;

  const botInstance = getBot();
  const siteUrl = process.env.SITE_URL || 'https://aikyamjobs.org';
  const jobUrl = `${siteUrl}/jobs/${job.slug}`;
  const companyName = job.company?.name;
  const categories = job.categories || [];
  const metaLine = [companyName, job.location, job.jobType].filter(Boolean).map(escapeHtml).join(' · ');

  const messageLines = [`<b>${escapeHtml(job.title)}</b>`];
  if (metaLine) messageLines.push(metaLine);
  if (job.excerpt) messageLines.push(escapeHtml(job.excerpt));

  const channelKeyboard = new InlineKeyboard().url('View & Apply', jobUrl);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  if (botUsername && categories.length > 0) {
    const payload = `cats-${categories.map((c) => c.id).join('-')}`;
    channelKeyboard.row().url('🔔 Get alerts for jobs like this', `https://t.me/${botUsername}?start=${payload}`);
  }

  let sent;
  try {
    sent = await botInstance.api.sendMessage(channel, messageLines.join('\n\n'), {
      parse_mode: 'HTML',
      reply_markup: channelKeyboard,
    });
  } catch (err) {
    strapi.log.error('[telegram-bot] failed to post job to channel', err);
    return;
  }

  if (categories.length === 0) return;

  const categoryIds = categories.map((c) => c.id);
  const subscribers = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findMany({
    where: { categories: { id: { $in: categoryIds } } },
  });

  const uniqueSubscribers = Array.from(new Map(subscribers.map((s) => [s.id, s])).values());
  if (uniqueSubscribers.length === 0) return;

  const channelHandle = channel.replace(/^@/, '');
  const channelLink = `https://t.me/${channelHandle}/${sent.message_id}`;

  const dmLines = [`New job matching your alerts: <b>${escapeHtml(job.title)}</b>`];
  if (metaLine) dmLines.push(metaLine);
  dmLines.push(`<a href="${channelLink}">View the post on the channel →</a>`);
  const dmText = dmLines.join('\n\n');

  await Promise.allSettled(
    uniqueSubscribers.map((subscriber) =>
      botInstance.api.sendMessage(subscriber.chatId, dmText, { parse_mode: 'HTML' }).catch((err) => {
        strapi.log.warn(`[telegram-bot] failed to DM subscriber ${subscriber.chatId}`, err.message || err);
      })
    )
  );
}

module.exports = {
  startBot,
  stopBot,
  notifyJobPublished,
};
