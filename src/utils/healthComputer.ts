import type { Context } from '@devvit/public-api';
import type { HealthStats, HealthTrendPoint, RecentAction } from '../types.js';
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
  const [actionLogRaw, rulesRaw, queueRaw] = await Promise.all([
    context.redis.get(REDIS_KEYS.actionLog(subredditName)),
    context.redis.get(REDIS_KEYS.rules(subredditName)),
    context.redis.get(REDIS_KEYS.queue(subredditName)),
  ]);
  const actionLog: Array<{ action: string; mod: string; timestamp: number; itemId: string; automated?: boolean }> =
    actionLogRaw ? JSON.parse(actionLogRaw) : [];
  const rules: Array<{ name: string; matchCount?: number }> =
    rulesRaw ? JSON.parse(rulesRaw) : [];
  const queue: Array<{
    id: string; status: string; author: string; type: string; createdAt: number;
    aiScore?: { aiGenerated: number; scoredAt?: number };
  }> = queueRaw ? JSON.parse(queueRaw) : [];

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

  // Compute average review time from action timestamps vs item creation times
  const reviewTimes: number[] = [];
  for (const a of recentActions) {
    if (a.action === 'remove' || a.action === 'approve') {
      const item = queue.find(q => q.id === a.itemId);
      if (item?.createdAt) {
        const diffMins = (a.timestamp - item.createdAt) / (1000 * 60);
        if (diffMins > 0 && diffMins < 24 * 60) reviewTimes.push(diffMins);
      }
    }
  }
  const avgReviewTimeMins = reviewTimes.length > 0
    ? Math.round((reviewTimes.reduce((s, t) => s + t, 0) / reviewTimes.length) * 10) / 10
    : 0;

  const trend = buildTrend(actionLog, queue);

  const recentActionsList: RecentAction[] = actionLog.slice(0, 25).map(a => ({
    itemId: a.itemId,
    action: a.action,
    mod: a.mod,
    automated: a.automated ?? false,
    timestamp: a.timestamp,
  }));

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
    topViolations: rules
      .filter(r => (r.matchCount ?? 0) > 0)
      .sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0))
      .slice(0, 5)
      .map(r => ({ rule: r.name, count: r.matchCount ?? 0 })),
    mostActioned: Object.entries(userActionMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([username, count]) => ({ username, count })),
    queueDepth: queue.filter(i => i.status === 'pending').length,
    avgReviewTimeMins,
    modActivity: Object.entries(modActivityMap)
      .sort(([, a], [, b]) => b - a)
      .map(([mod, actions]) => ({ mod, actions })),
    trend,
    recentActions: recentActionsList,
  };

  return stats;
}

function buildTrend(
  actionLog: Array<{ action: string; timestamp: number }>,
  queue: Array<{ aiScore?: { aiGenerated: number; scoredAt?: number } }>,
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

    const dayAiSuspected = queue.filter(
      q => q.aiScore?.scoredAt !== undefined &&
           q.aiScore.scoredAt >= dayStart &&
           q.aiScore.scoredAt < dayEnd &&
           q.aiScore.aiGenerated >= 70,
    ).length;

    points.push({
      date,
      removed: dayActions.filter(a => a.action === 'remove').length,
      approved: dayActions.filter(a => a.action === 'approve').length,
      aiSuspected: dayAiSuspected,
      queueDepth: 0,
    });
  }

  return points;
}
