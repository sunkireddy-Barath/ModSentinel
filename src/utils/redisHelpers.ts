import type { Context } from '@devvit/public-api';
import type { QueueItem, AppConfig } from '../types.js';
import { REDIS_KEYS, QUEUE_MAX_SIZE, QUEUE_ITEM_TTL_MS } from '../constants.js';

export async function getConfig(context: Context): Promise<AppConfig> {
  const sub = await context.reddit.getCurrentSubreddit();
  const key = REDIS_KEYS.config(sub?.name ?? 'unknown');
  const stored = await context.redis.get(key);

  if (stored) return JSON.parse(stored) as AppConfig;

  const defaults: AppConfig = {
    subreddit: sub?.name ?? 'unknown',
    setupComplete: false,
    anthropicApiKeySet: false,
    autoScoreEnabled: true,
    autoActionEnabled: false,
    installedAt: Date.now(),
    installedBy: 'unknown',
  };
  return defaults;
}

export async function saveConfig(context: Context, config: AppConfig): Promise<void> {
  const key = REDIS_KEYS.config(config.subreddit);
  await context.redis.set(key, JSON.stringify(config));
}

export async function loadQueue(context: Context, subredditName: string): Promise<QueueItem[]> {
  const key = REDIS_KEYS.queue(subredditName);
  const stored = await context.redis.get(key);
  if (!stored) return [];

  const items = JSON.parse(stored) as QueueItem[];
  const cutoff = Date.now() - QUEUE_ITEM_TTL_MS;

  // Filter out expired items
  return items.filter(i => i.createdAt > cutoff);
}

export async function upsertQueueItem(
  context: Context,
  subredditName: string,
  item: QueueItem,
): Promise<void> {
  const key = REDIS_KEYS.queue(subredditName);
  const stored = await context.redis.get(key);
  const items: QueueItem[] = stored ? (JSON.parse(stored) as QueueItem[]) : [];

  const idx = items.findIndex(i => i.id === item.id);
  if (idx >= 0) {
    items[idx] = item;
  } else {
    items.unshift(item);
  }

  await context.redis.set(key, JSON.stringify(items.slice(0, QUEUE_MAX_SIZE)));
}

export async function updateQueueItemStatus(
  context: Context,
  subredditName: string,
  itemId: string,
  status: QueueItem['status'],
): Promise<void> {
  const key = REDIS_KEYS.queue(subredditName);
  const stored = await context.redis.get(key);
  if (!stored) return;

  const items = JSON.parse(stored) as QueueItem[];
  const updated = items.map(i => (i.id === itemId ? { ...i, status } : i));
  await context.redis.set(key, JSON.stringify(updated));
}

export async function checkIsMod(
  context: Context,
  subredditName: string,
  username: string,
): Promise<boolean> {
  try {
    const mods = await context.reddit.getModerators({ subredditName });
    const modList: string[] = [];
    for await (const mod of mods) {
      modList.push(mod.username);
    }
    return modList.includes(username);
  } catch {
    return false;
  }
}

export async function buildQueueItemFromPost(
  context: Context,
  postId: string,
): Promise<QueueItem | null> {
  try {
    const post = await context.reddit.getPostById(postId);
    const author = await context.reddit.getUserByUsername(post.authorName ?? 'unknown');

    const accountAgeDays = author
      ? Math.floor((Date.now() - author.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: postId,
      type: 'post',
      title: post.title,
      body: post.body ?? '',
      author: post.authorName ?? '[deleted]',
      authorKarma: (author?.linkKarma ?? 0) + (author?.commentKarma ?? 0),
      authorAge: accountAgeDays,
      subreddit: post.subredditName,
      url: post.url,
      permalink: post.permalink,
      createdAt: post.createdAt.getTime(),
      reportCount: post.numberOfReports ?? 0,
      reportReasons: [],
      status: 'pending',
    };
  } catch {
    return null;
  }
}

export async function buildQueueItemFromComment(
  context: Context,
  commentId: string,
): Promise<QueueItem | null> {
  try {
    const comment = await context.reddit.getCommentById(commentId);
    const author = await context.reddit.getUserByUsername(comment.authorName ?? 'unknown');

    const accountAgeDays = author
      ? Math.floor((Date.now() - author.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      id: commentId,
      type: 'comment',
      body: comment.body,
      author: comment.authorName ?? '[deleted]',
      authorKarma: (author?.linkKarma ?? 0) + (author?.commentKarma ?? 0),
      authorAge: accountAgeDays,
      subreddit: comment.subredditName,
      url: `https://reddit.com${comment.permalink}`,
      permalink: comment.permalink,
      createdAt: comment.createdAt.getTime(),
      reportCount: comment.numReports ?? 0,
      reportReasons: [],
      status: 'pending',
    };
  } catch {
    return null;
  }
}
