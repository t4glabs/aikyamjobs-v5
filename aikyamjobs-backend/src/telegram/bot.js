'use strict';

const os = require('os');
const fs = require('fs');
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

async function getSubscribedIds(chatId) {
  const subscriber = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findOne({
    where: { chatId },
    populate: ['categories'],
  });
  return new Set((subscriber?.categories || []).map((c) => c.id));
}

// Renders a 2-per-row grid of toggle buttons with no stray empty rows.
function buildToggleKeyboard(categories, subscribedIds, callbackDataFor) {
  if (categories.length === 0) return new InlineKeyboard([]);

  const keyboard = new InlineKeyboard();
  categories.forEach((category, index) => {
    if (index > 0 && index % 2 === 0) keyboard.row();
    const checked = subscribedIds.has(category.id) ? '✅ ' : '';
    keyboard.text(`${checked}${category.name}`, callbackDataFor(category.id));
  });
  return keyboard;
}

function withSearchButton(keyboard) {
  keyboard.row().switchInlineCurrent('🔎 Search categories by yourself', '');
  return keyboard;
}

function withBrowseMoreButton(keyboard) {
  keyboard.row().text('🔎 See more categories', 'p:b:0');
  return withSearchButton(keyboard);
}

// Fixed set of categories (a job's own tags) — same set shown before and after toggling.
async function buildJobScopeKeyboard(chatId, categoryIds) {
  if (categoryIds.length === 0) return new InlineKeyboard([]);
  const categories = await strapi.db.query('api::category.category').findMany({
    select: ['id', 'name'],
    where: { id: { $in: categoryIds } },
    orderBy: { name: 'asc' },
  });
  const subscribedIds = await getSubscribedIds(chatId);
  const idsCsv = categoryIds.join('-');
  return buildToggleKeyboard(categories, subscribedIds, (catId) => `t:j:${catId}:${idsCsv}`);
}

// Dynamic set — always exactly what the user is currently subscribed to.
async function buildSubscribedScopeKeyboard(chatId) {
  const subscribedIds = await getSubscribedIds(chatId);
  if (subscribedIds.size === 0) return new InlineKeyboard([]);
  const categories = await strapi.db.query('api::category.category').findMany({
    select: ['id', 'name'],
    where: { id: { $in: Array.from(subscribedIds) } },
    orderBy: { name: 'asc' },
  });
  return buildToggleKeyboard(categories, subscribedIds, (catId) => `t:s:${catId}`);
}

const BROWSE_PAGE_SIZE = 12;

// Paginated browse of every category — opt-in only, never shown by default.
async function buildBrowseKeyboard(chatId, page) {
  const totalCount = await strapi.db.query('api::category.category').count();
  const categories = await strapi.db.query('api::category.category').findMany({
    select: ['id', 'name'],
    orderBy: { name: 'asc' },
    limit: BROWSE_PAGE_SIZE,
    offset: page * BROWSE_PAGE_SIZE,
  });
  const subscribedIds = await getSubscribedIds(chatId);
  const keyboard = buildToggleKeyboard(categories, subscribedIds, (catId) => `t:b:${catId}:${page}`);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * BROWSE_PAGE_SIZE < totalCount;
  if (hasPrev || hasNext) {
    keyboard.row();
    if (hasPrev) keyboard.text('◀ Prev', `p:b:${page - 1}`);
    if (hasNext) keyboard.text('Next ▶', `p:b:${page + 1}`);
  }
  return withSearchButton(keyboard);
}

const INLINE_SEARCH_LIMIT = 30;

// Inline search — lets the user type "@botname query" in this chat instead of
// paging through 170+ categories. Requires inline mode enabled via @BotFather
// (/setinline); Telegram silently drops the query otherwise.
async function buildInlineSearchResults(query, chatId) {
  const categories = await strapi.db.query('api::category.category').findMany({
    select: ['id', 'name'],
    where: query ? { name: { $containsi: query } } : {},
    orderBy: { name: 'asc' },
    limit: INLINE_SEARCH_LIMIT,
  });
  const subscribedIds = await getSubscribedIds(chatId);

  return categories.map((category) => {
    const checked = subscribedIds.has(category.id);
    return {
      type: 'article',
      id: String(category.id),
      title: `${checked ? '✅ ' : ''}${category.name}`,
      description: checked ? 'Subscribed — tap to view' : 'Tap to view and subscribe',
      input_message_content: { message_text: `Subscribe to "${category.name}"?` },
      reply_markup: new InlineKeyboard().text(
        checked ? '✅ Subscribed' : '🔔 Subscribe',
        `t:q:${category.id}`
      ),
    };
  });
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

function getAdminIds() {
  return new Set(
    (process.env.TELEGRAM_ADMIN_CHAT_IDS || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

function formatGb(bytes) {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

async function getDiskStats() {
  try {
    const stats = await fs.promises.statfs('/');
    return { total: stats.blocks * stats.bsize, free: stats.bfree * stats.bsize };
  } catch {
    return null;
  }
}

async function getSubscriberStats() {
  const subscribers = await strapi.db.query('api::telegram-subscriber.telegram-subscriber').findMany({
    select: ['id'],
    populate: ['categories'],
  });

  const categoryCounts = new Map(); // categoryId -> { name, count }
  let activeSubscribers = 0;

  for (const subscriber of subscribers) {
    const categories = subscriber.categories || [];
    if (categories.length > 0) activeSubscribers += 1;
    for (const category of categories) {
      const entry = categoryCounts.get(category.id) || { name: category.name, count: 0 };
      entry.count += 1;
      categoryCounts.set(category.id, entry);
    }
  }

  const topCategories = Array.from(categoryCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return { totalSubscribers: subscribers.length, activeSubscribers, topCategories };
}

async function buildStatusMessage(botInstance) {
  const channel = process.env.TELEGRAM_CHANNEL_USERNAME;
  let channelMemberCount = 'n/a';
  if (channel) {
    try {
      channelMemberCount = String(await botInstance.api.getChatMemberCount(channel));
    } catch {
      channelMemberCount = 'error fetching';
    }
  }

  const { totalSubscribers, activeSubscribers, topCategories } = await getSubscriberStats();
  const topCategoriesText = topCategories.length
    ? topCategories.map((c) => `${c.name} (${c.count})`).join(', ')
    : 'none yet';

  const disk = await getDiskStats();
  const lines = [
    '📊 <b>aikyamjobs Bot Status</b>',
    '',
    `Channel members: ${channelMemberCount}`,
    `Bot users (started bot): ${totalSubscribers}`,
    `Active alert subscribers: ${activeSubscribers}`,
    '',
    `Top subscribed categories: ${topCategoriesText}`,
    '',
    `Bot uptime: ${(process.uptime() / 3600).toFixed(1)}h`,
    `RAM free: ${formatGb(os.freemem())} / ${formatGb(os.totalmem())}`,
  ];
  if (disk) lines.push(`Disk free: ${formatGb(disk.free)} / ${formatGb(disk.total)}`);
  lines.push(`Load avg (1m): ${os.loadavg()[0].toFixed(2)}`);

  return lines.join('\n');
}

function registerHandlers(botInstance, strapiInstance) {
  botInstance.command('start', async (ctx) => {
    const chatId = String(ctx.chat.id);
    await findOrCreateSubscriber(chatId, ctx.from);

    const categoryIds = parseCategoryPayload(ctx.match || '');
    if (categoryIds.length > 0) {
      const keyboard = withBrowseMoreButton(await buildJobScopeKeyboard(chatId, categoryIds));
      await ctx.reply('Want alerts for jobs like this one? Tap a category to subscribe:', {
        reply_markup: keyboard,
      });
      return;
    }

    await ctx.reply(
      '👋 Welcome to aikyamjobs Job Alerts!\n\n' +
        'Head over to the channel for the latest postings: https://t.me/aikyamjobs\n\n' +
        'To get notified about a specific type of role, tap "🔔 Subscribe to this job category" under any job post in the channel — or use /subscriptions anytime to manage what you\'re subscribed to.'
    );
  });

  botInstance.command('subscriptions', async (ctx) => {
    const chatId = String(ctx.chat.id);
    const subscribedIds = await getSubscribedIds(chatId);
    const summary = subscribedIds.size
      ? "You're currently subscribed to the categories below. Tap to unsubscribe, or see more to add:"
      : "You're not subscribed to any categories yet. Tap below to browse and subscribe:";
    const keyboard = withBrowseMoreButton(await buildSubscribedScopeKeyboard(chatId));
    await ctx.reply(summary, { reply_markup: keyboard });
  });

  // Toggle within a job's own category set — re-renders the same fixed set, never the full list.
  botInstance.callbackQuery(/^t:j:(\d+):([\d-]+)$/, async (ctx) => {
    const categoryId = Number(ctx.match[1]);
    const scopeIds = ctx.match[2].split('-').map(Number);
    const chatId = String(ctx.chat.id);
    const subscribed = await toggleSubscription(chatId, ctx.from, categoryId);
    await ctx.answerCallbackQuery({ text: subscribed ? 'Subscribed ✅' : 'Unsubscribed' });
    const keyboard = withBrowseMoreButton(await buildJobScopeKeyboard(chatId, scopeIds));
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
  });

  // Toggle within /subscriptions — re-renders whatever is still subscribed after the change.
  botInstance.callbackQuery(/^t:s:(\d+)$/, async (ctx) => {
    const categoryId = Number(ctx.match[1]);
    const chatId = String(ctx.chat.id);
    const subscribed = await toggleSubscription(chatId, ctx.from, categoryId);
    await ctx.answerCallbackQuery({ text: subscribed ? 'Subscribed ✅' : 'Unsubscribed' });
    const keyboard = withBrowseMoreButton(await buildSubscribedScopeKeyboard(chatId));
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
  });

  // Toggle within the paginated "browse all categories" view — stays on the same page.
  botInstance.callbackQuery(/^t:b:(\d+):(\d+)$/, async (ctx) => {
    const categoryId = Number(ctx.match[1]);
    const page = Number(ctx.match[2]);
    const chatId = String(ctx.chat.id);
    const subscribed = await toggleSubscription(chatId, ctx.from, categoryId);
    await ctx.answerCallbackQuery({ text: subscribed ? 'Subscribed ✅' : 'Unsubscribed' });
    const keyboard = await buildBrowseKeyboard(chatId, page);
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
  });

  // "See more categories" / pagination — switches the message into browse mode.
  botInstance.callbackQuery(/^p:b:(\d+)$/, async (ctx) => {
    const page = Number(ctx.match[1]);
    const chatId = String(ctx.chat.id);
    const keyboard = await buildBrowseKeyboard(chatId, page);
    await ctx.answerCallbackQuery();
    await ctx
      .editMessageText('Browse all categories — tap to subscribe or unsubscribe:', { reply_markup: keyboard })
      .catch(() => ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {}));
  });

  // Toggle on a single category picked from inline search results. These buttons
  // live on a message Telegram sent on the bot's behalf (no ctx.chat, only
  // ctx.inlineMessageId) — the user who tapped is always the right subscriber.
  botInstance.callbackQuery(/^t:q:(\d+)$/, async (ctx) => {
    const categoryId = Number(ctx.match[1]);
    const chatId = String(ctx.from.id);
    const subscribed = await toggleSubscription(chatId, ctx.from, categoryId);
    await ctx.answerCallbackQuery({ text: subscribed ? 'Subscribed ✅' : 'Unsubscribed' });
    const keyboard = new InlineKeyboard().text(
      subscribed ? '✅ Subscribed' : '🔔 Subscribe',
      `t:q:${categoryId}`
    );
    await ctx.editMessageReplyMarkup({ reply_markup: keyboard }).catch(() => {});
  });

  // Inline search — "@botname query" typed in the chat via the switchInlineCurrent button.
  botInstance.on('inline_query', async (ctx) => {
    const query = (ctx.inlineQuery.query || '').trim();
    const chatId = String(ctx.from.id);
    const results = await buildInlineSearchResults(query, chatId);
    await ctx.answerInlineQuery(results, { cache_time: 0, is_personal: true }).catch((err) => {
      strapiInstance.log.warn('[telegram-bot] answerInlineQuery failed', err.message || err);
    });
  });

  // Hidden admin-only command — deliberately left out of setMyCommands so it
  // never appears in the public "/" menu. Silently ignored for non-admins.
  botInstance.command('status', async (ctx) => {
    if (!getAdminIds().has(String(ctx.from?.id))) return;
    const message = await buildStatusMessage(botInstance);
    await ctx.reply(message, { parse_mode: 'HTML' });
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

  const messageLines = [`<b><a href="${jobUrl}">${escapeHtml(job.title)}</a></b>`];
  if (metaLine) messageLines.push(metaLine);
  if (job.excerpt) messageLines.push(escapeHtml(job.excerpt));

  const botUsername = process.env.TELEGRAM_BOT_USERNAME;
  let channelKeyboard;
  if (botUsername && categories.length > 0) {
    const payload = `cats-${categories.map((c) => c.id).join('-')}`;
    channelKeyboard = new InlineKeyboard().url('🔔 Subscribe to this job category', `https://t.me/${botUsername}?start=${payload}`);
  }

  let sent;
  try {
    sent = await botInstance.api.sendMessage(channel, messageLines.join('\n\n'), {
      parse_mode: 'HTML',
      link_preview_options: { url: jobUrl },
      ...(channelKeyboard ? { reply_markup: channelKeyboard } : {}),
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
