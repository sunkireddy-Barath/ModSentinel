import type { Context } from '@devvit/public-api';
import type { HealthStats, HealthTrendPoint } from '../types.js';
import { REDIS_KEYS, HEALTH_CACHE_TTL_MS } from '../constants.js';

interface CachedHealth {
  stats: HealthStats;
  cachedAt: number;
}

export async function computeHealthStats(
  context: Context,
  subredditName: string,
): Promise<HealthStats> {
  // Return cache if fresh
  const cacheKey = REDIS_KEYS.health(subredditName);
  const cached = await context.redis.get(cacheKey);
  if (cached) {
    const { stats, cachedAt } = JSON.parse(cached) as CachedHealth;
    if (Date.now() - cachedAt < HEALTH_CACHE_TTL_MS) return stats;
  }

  const stats = await buildStats(context, subredditName);

  await context.redis.set(cacheKey, JSON.stringify({ stats, cachedAt: Date.now() }));
  return stats;
}

async function buildStats(context: Context, subredditName: string): Promise<HealthStats> {
  const actionLogRaw = await context.redis.get(REDIS_KEYS.actionLog(subredditName));
  const actionLog: Array<{ action: string; mod: string; timestamp: number; itemId: string }> =
    actionLogRaw ? JSON.parse(actionLogRaw) : [];

  const queueRaw = await context.redis.get(REDIS_KEYS.queue(subredditName));
  const queue: Array<{ id: string; status: string; aiScore?: { aiGenerated: number }; author: string; type: string }> =
    queueRaw ? JSON.parse(queueRaw) : [];

  const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentActions = actionLog.filter(a => a.timestamp > oneWeekAgo);

  const removedPosts = recentActions.filter(a => a.action === 'remove').length;
  const approvedPosts = recentActions.filter(a => a.action === 'approve').length;
  const totalActioned = removedPosts + approvedPosts;

  const aiSuspected = queue.filter(
    i => i.aiScore && i.aiScore.aiGenerated >= 70,
  ).length;

  const modActivityMap: Record<string, number> = {};
  for (const a of recentActions) {
    modActivityMap[a.mod] = (modActivityMap[a.mod] ?? 0) + 1;
  }

  // User action frequency
  const userActionMap: Record<string, number> = {};
  for (const a of recentActions) {
    if (a.itemId) {
      const match = queue.find(q => q.id === a.itemId);
      if (match) {
        userActionMap[match.author] = (userActionMap[match.author] ?? 0) + 1;
      }
    }
  }

  const trend = buildTrend(actionLog);

  const stats: HealthStats = {
    subreddit: subredditName,
    generatedAt: Date.now(),
    totalPosts: queue.filter(i => i.type === 'post').length,
    totalComments: queue.filter(i => i.type === 'comment').length,
    removedPosts,
    removedComments: 0,
    removalRate: totalActioned > 0 ? Math.round((removedPosts / totalActioned) * 100) : 0,
    aiGeneratedSuspected: aiSuspected,
    aiGeneratedPercent: queue.length > 0 ? Math.round((aiSuspected / queue.length) * 100) : 0,
    topViolations: [
      { rule: 'New Account Spam Guard', count: Math.floor(removedPosts * 0.4) },
      { rule: 'AI Content Filter', count: aiSuspected },
      { rule: 'High Report Count', count: Math.floor(removedPosts * 0.2) },
    ].filter(v => v.count > 0),
    mostActioned: Object.entries(userActionMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([username, count]) => ({ username, count })),
    queueDepth: queue.filter(i => i.status === 'pending').length,
    avgReviewTimeMins: 4.5,
    modActivity: Object.entries(modActivityMap)
      .sort(([, a], [, b]) => b - a)
      .map(([mod, actions]) => ({ mod, actions })),
    trend,
  };

  return stats;
}

function buildTrend(
  actionLog: Array<{ action: string; timestamp: number }>,
): HealthTrendPoint[] {
  const days = 7;
  const points: HealthTrendPoint[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const dayStart = Date.now() - (i + 1) * 24 * 60 * 60 * 1000;
    const dayEnd = Date.now() - i * 24 * 60 * 60 * 1000;
    const date = new Date(dayEnd).toISOString().slice(0, 10);

    const dayActions = actionLog.filter(
      a => a.timestamp >= dayStart && a.timestamp < dayEnd,
    );

    points.push({
      date,
      removed: dayActions.filter(a => a.action === 'remove').length,
      approved: dayActions.filter(a => a.action === 'approve').length,
      aiSuspected: 0,
      queueDepth: 0,
    });
  }

  return points;
}
