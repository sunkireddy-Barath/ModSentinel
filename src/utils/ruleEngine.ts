/**
 * ContextMod-compatible rule engine ported to Devvit.
 *
 * Original: https://github.com/FoxxMD/context-mod (MIT)
 * Key differences: PRAW → Devvit Reddit API, hosted server → Devvit serverless triggers
 */
import type { Context } from '@devvit/public-api';
import type { Rule, RuleCondition, QueueItem, AIScore } from '../types.js';
import { REDIS_KEYS } from '../constants.js';

interface EvaluationContext {
  item: QueueItem;
  aiScore?: AIScore;
  postCount24h?: number;
  commentCount24h?: number;
  crossSubCount24h?: number;
}

export async function evaluateRules(
  context: Context,
  item: QueueItem,
  aiScore: AIScore | undefined,
  subredditName: string,
): Promise<{ matched: Rule | null; reason: string }> {
  const rulesRaw = await context.redis.get(REDIS_KEYS.rules(subredditName));
  const rules: Rule[] = rulesRaw ? (JSON.parse(rulesRaw) as Rule[]) : [];

  const enabled = rules
    .filter(r => r.enabled && (r.appliesTo === 'both' || r.appliesTo === `${item.type}s`))
    .sort((a, b) => a.priority - b.priority);

  if (enabled.length === 0) return { matched: null, reason: 'no rules' };

  // Fetch activity counters lazily
  let postCount24h: number | undefined;
  let commentCount24h: number | undefined;
  let crossSubCount24h: number | undefined;

  const needsPostCount = enabled.some(r => r.conditions.some(c => c.field === 'post_count_24h'));
  const needsCommentCount = enabled.some(r => r.conditions.some(c => c.field === 'comment_count_24h'));
  const needsCrossSubCount = enabled.some(r => r.conditions.some(c => c.field === 'cross_sub_count_24h'));

  if (needsPostCount || needsCommentCount) {
    try {
      const counts = await getActivityCounts(context, item.author, subredditName);
      postCount24h = counts.posts;
      commentCount24h = counts.comments;
    } catch {
      postCount24h = 0;
      commentCount24h = 0;
    }
  }

  if (needsCrossSubCount) {
    try {
      crossSubCount24h = await getCrossSubCount(context, item.author);
    } catch {
      crossSubCount24h = 0;
    }
  }

  const evalCtx: EvaluationContext = {
    item,
    aiScore,
    postCount24h,
    commentCount24h,
    crossSubCount24h,
  };

  for (const rule of enabled) {
    const matched = evaluateRule(rule, evalCtx);
    if (matched) {
      // Increment match counter
      rule.matchCount = (rule.matchCount ?? 0) + 1;
      const updated = rules.map(r => (r.id === rule.id ? rule : r));
      await context.redis.set(REDIS_KEYS.rules(subredditName), JSON.stringify(updated));
      return { matched: rule, reason: `Rule "${rule.name}" matched` };
    }
  }

  return { matched: null, reason: 'no match' };
}

function evaluateRule(rule: Rule, ctx: EvaluationContext): boolean {
  const results = rule.conditions.map(c => evaluateCondition(c, ctx));
  return rule.conditionLogic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

function evaluateCondition(cond: RuleCondition, ctx: EvaluationContext): boolean {
  const { item, aiScore } = ctx;

  switch (cond.field) {
    case 'account_age':
      return compare(item.authorAge, cond.operator, Number(cond.value));

    case 'karma':
      return compare(item.authorKarma, cond.operator, Number(cond.value));

    case 'post_count_24h':
      return compare(ctx.postCount24h ?? 0, cond.operator, Number(cond.value));

    case 'comment_count_24h':
      return compare(ctx.commentCount24h ?? 0, cond.operator, Number(cond.value));

    case 'cross_sub_count_24h':
      return compare(ctx.crossSubCount24h ?? 0, cond.operator, Number(cond.value));

    case 'ai_score':
      return aiScore ? compare(aiScore.score, cond.operator, Number(cond.value)) : false;

    case 'spam_score':
      return aiScore ? compare(aiScore.spamScore, cond.operator, Number(cond.value)) : false;

    case 'report_count':
      return compare(item.reportCount, cond.operator, Number(cond.value));

    case 'body_contains':
      return stringMatch(item.body.toLowerCase(), cond.operator, String(cond.value).toLowerCase());

    case 'title_contains':
      return stringMatch((item.title ?? '').toLowerCase(), cond.operator, String(cond.value).toLowerCase());

    case 'flair_text':
      return false; // requires flair data not always available

    default:
      return false;
  }
}

function compare(actual: number, op: string, expected: number): boolean {
  switch (op) {
    case 'lt':  return actual < expected;
    case 'lte': return actual <= expected;
    case 'gt':  return actual > expected;
    case 'gte': return actual >= expected;
    case 'eq':  return actual === expected;
    default:    return false;
  }
}

function stringMatch(actual: string, op: string, expected: string): boolean {
  switch (op) {
    case 'contains':     return actual.includes(expected);
    case 'not_contains': return !actual.includes(expected);
    case 'eq':           return actual === expected;
    case 'matches_regex': {
      try {
        return new RegExp(expected, 'i').test(actual);
      } catch {
        return false;
      }
    }
    default: return false;
  }
}

async function getActivityCounts(
  context: Context,
  username: string,
  subredditName: string,
): Promise<{ posts: number; comments: number }> {
  try {
    const user = await context.reddit.getUserByUsername(username);
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;

    const recentPosts = await context.reddit.getPostsByUser({
      username,
      sort: 'new',
      limit: 25,
    });

    let posts = 0;
    for await (const post of recentPosts) {
      if (post.createdAt.getTime() < cutoff) break;
      if (post.subredditName === subredditName) posts++;
    }

    return { posts, comments: 0 };
  } catch {
    return { posts: 0, comments: 0 };
  }
}

async function getCrossSubCount(context: Context, username: string): Promise<number> {
  try {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const subs = new Set<string>();

    const recentPosts = await context.reddit.getPostsByUser({
      username,
      sort: 'new',
      limit: 50,
    });

    for await (const post of recentPosts) {
      if (post.createdAt.getTime() < cutoff) break;
      subs.add(post.subredditName);
    }

    return subs.size;
  } catch {
    return 0;
  }
}
