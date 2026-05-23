/** @jsx Devvit.createElement */
/** @jsxFrag Devvit.Fragment */
import Devvit, { useState, useWebView } from '@devvit/public-api';
import type { Context } from '@devvit/public-api';
import type {
  WebViewToDevvit,
  DevvitToWebView,
  ModNote,
  Rule,
  AppConfig,
  QueueItem,
  AIScore,
} from './types.js';
import { REDIS_KEYS, DEFAULT_RULES } from './constants.js';
import { scoreContent } from './utils/aiScorer.js';
import { evaluateRules } from './utils/ruleEngine.js';
import { handleModAction, applyRuleAction, logAction } from './utils/actionHandler.js';
import { computeHealthStats } from './utils/healthComputer.js';
import {
  getConfig,
  saveConfig,
  loadQueue,
  upsertQueueItem,
  updateQueueItemStatus,
  checkIsMod,
  buildQueueItemFromPost,
  buildQueueItemFromComment,
} from './utils/redisHelpers.js';

Devvit.configure({
  redditAPI: true,
  redis: true,
  http: true,
  realtime: false,
  media: false,
});

// ─── Settings ────────────────────────────────────────────────────────────────

Devvit.addSettings([
  {
    name: 'anthropic-api-key',
    label: 'Anthropic API Key',
    type: 'string',
    scope: 'app',
    isSecret: true,
    helpText: 'Get your API key at console.anthropic.com — used for AI content scoring',
  },
  {
    name: 'auto-score-enabled',
    label: 'Auto-score new posts and comments',
    type: 'boolean',
    scope: 'installation',
    defaultValue: true,
    helpText: 'Runs Claude AI scoring on every new post/comment in the background',
  },
  {
    name: 'auto-action-enabled',
    label: 'Auto-apply rules (live enforcement)',
    type: 'boolean',
    scope: 'installation',
    defaultValue: false,
    helpText: 'Automatically take action when a rule matches. Enable only after testing your rules.',
  },
]);

// ─── Custom Post Type ─────────────────────────────────────────────────────────

Devvit.addCustomPostType({
  name: 'ModSentinel Dashboard',
  description: 'AI-powered moderation command center',
  height: 'tall',
  render: (context: Context) => {
    const [isLoading, setIsLoading] = useState(true);

    const webView = useWebView<WebViewToDevvit, DevvitToWebView>({
      url: 'index.html',
      onMessage: async (message: WebViewToDevvit) => {
        try {
          await routeMessage(message, context, (msg) => webView.postMessage(msg));
        } catch (err) {
          webView.postMessage({
            type: 'ERROR',
            message: err instanceof Error ? err.message : 'An unexpected error occurred',
            code: 'UNHANDLED',
          });
        }
      },
    });

    return (
      <vstack height="100%" width="100%" backgroundColor="#0f1116">
        <webview
          id={webView.id}
          url={webView.url}
          width="100%"
          height="100%"
          grow
        />
      </vstack>
    );
  },
});

// ─── Message Router ───────────────────────────────────────────────────────────

async function routeMessage(
  message: WebViewToDevvit,
  context: Context,
  send: (msg: DevvitToWebView) => void,
): Promise<void> {
  switch (message.type) {
    // ── Init ──────────────────────────────────────────────────────────────────
    case 'INIT': {
      const [user, sub] = await Promise.all([
        context.reddit.getCurrentUser(),
        context.reddit.getCurrentSubreddit(),
      ]);
      const config = await getConfig(context);
      const apiKey = await context.settings.get<string>('anthropic-api-key');
      config.anthropicApiKeySet = Boolean(apiKey);

      const isMod = user?.username
        ? await checkIsMod(context, sub?.name ?? '', user.username)
        : false;

      send({
        type: 'INIT_DATA',
        config,
        username: user?.username ?? 'unknown',
        isMod,
        subreddit: sub?.name ?? '',
      });
      break;
    }

    // ── Queue ─────────────────────────────────────────────────────────────────
    case 'LOAD_QUEUE': {
      const sub = await context.reddit.getCurrentSubreddit();
      const items = await loadQueue(context, sub?.name ?? '');
      send({ type: 'QUEUE_DATA', items, total: items.length });
      break;
    }

    // ── Score ─────────────────────────────────────────────────────────────────
    case 'SCORE_ITEM': {
      const { itemId, body, title } = message;
      const sub = await context.reddit.getCurrentSubreddit();
      const apiKey = await context.settings.get<string>('anthropic-api-key');

      const score = await scoreContent(context, {
        content: body,
        title,
        apiKey: apiKey ?? '',
      });

      await context.redis.set(
        REDIS_KEYS.score(sub?.name ?? '', itemId),
        JSON.stringify(score),
      );

      // Attach score to queue item
      const items = await loadQueue(context, sub?.name ?? '');
      const updated = items.map(i =>
        i.id === itemId ? { ...i, aiScore: score } : i,
      );
      await context.redis.set(REDIS_KEYS.queue(sub?.name ?? ''), JSON.stringify(updated));

      send({ type: 'SCORE_RESULT', itemId, score });
      break;
    }

    // ── Action ────────────────────────────────────────────────────────────────
    case 'TAKE_ACTION': {
      const { itemId, action, reason, message: msg, banDuration } = message;
      const [user, sub] = await Promise.all([
        context.reddit.getCurrentUser(),
        context.reddit.getCurrentSubreddit(),
      ]);

      const items = await loadQueue(context, sub?.name ?? '');
      const item = items.find(i => i.id === itemId);

      const result = await handleModAction(context, {
        itemId,
        action,
        reason,
        message: msg,
        banDuration,
        subredditName: sub?.name,
        authorUsername: item?.author,
      });

      if (result.success) {
        const newStatus = action === 'approve' ? 'approved' : action === 'remove' ? 'removed' : 'held';
        if (newStatus !== 'held') {
          await updateQueueItemStatus(context, sub?.name ?? '', itemId, newStatus as QueueItem['status']);
        }
        await logAction(context, sub?.name ?? '', {
          itemId,
          action,
          reason,
          mod: user?.username ?? 'unknown',
          timestamp: Date.now(),
          automated: false,
        });
      }

      send({ type: 'ACTION_COMPLETE', itemId, action, success: result.success, error: result.error });
      break;
    }

    // ── Notes ─────────────────────────────────────────────────────────────────
    case 'ADD_NOTE': {
      const { thingId, thingType, content, label } = message;
      const [user, sub] = await Promise.all([
        context.reddit.getCurrentUser(),
        context.reddit.getCurrentSubreddit(),
      ]);

      const note: ModNote = {
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        thingId,
        thingType,
        authorMod: user?.username ?? 'unknown',
        content,
        label,
        createdAt: Date.now(),
      };

      const key = REDIS_KEYS.notes(sub?.name ?? '', thingId);
      const existing = await context.redis.get(key);
      const notes: ModNote[] = existing ? (JSON.parse(existing) as ModNote[]) : [];
      notes.unshift(note);
      await context.redis.set(key, JSON.stringify(notes.slice(0, 50)));

      // Sync to Reddit native mod notes for users
      if (thingType === 'user') {
        try {
          const labelMap: Record<string, string> = {
            spam: 'SPAM',
            abuse: 'ABUSE_WARNING',
            warning: 'ABUSE_WARNING',
            helpful: 'HELPFUL',
            watch: 'SOLID_CONTRIBUTOR',
            info: 'HELPFUL',
          };
          await context.reddit.addModNote({
            subreddit: sub?.name ?? '',
            user: thingId,
            note: content,
            label: (labelMap[label] ?? 'HELPFUL') as Parameters<typeof context.reddit.addModNote>[0]['label'],
            redditId: thingId,
          });
        } catch {
          // Native mod notes may be unavailable; Redis note is still saved
        }
      }

      send({ type: 'NOTE_SAVED', note });
      break;
    }

    case 'GET_NOTES': {
      const { thingId } = message;
      const sub = await context.reddit.getCurrentSubreddit();
      const key = REDIS_KEYS.notes(sub?.name ?? '', thingId);
      const stored = await context.redis.get(key);
      const notes: ModNote[] = stored ? (JSON.parse(stored) as ModNote[]) : [];
      send({ type: 'NOTES_DATA', thingId, notes });
      break;
    }

    // ── Rules ─────────────────────────────────────────────────────────────────
    case 'LOAD_RULES': {
      const sub = await context.reddit.getCurrentSubreddit();
      const key = REDIS_KEYS.rules(sub?.name ?? '');
      const stored = await context.redis.get(key);
      const rules: Rule[] = stored ? (JSON.parse(stored) as Rule[]) : DEFAULT_RULES;
      send({ type: 'RULES_DATA', rules });
      break;
    }

    case 'SAVE_RULES': {
      const sub = await context.reddit.getCurrentSubreddit();
      const key = REDIS_KEYS.rules(sub?.name ?? '');
      await context.redis.set(key, JSON.stringify(message.rules));
      send({ type: 'RULES_SAVED', rules: message.rules, success: true });
      break;
    }

    // ── Health ────────────────────────────────────────────────────────────────
    case 'LOAD_HEALTH': {
      const sub = await context.reddit.getCurrentSubreddit();
      const stats = await computeHealthStats(context, sub?.name ?? '');
      send({ type: 'HEALTH_DATA', stats });
      break;
    }

    // ── User Profile ──────────────────────────────────────────────────────────
    case 'LOAD_USER': {
      const { username } = message;
      const sub = await context.reddit.getCurrentSubreddit();

      try {
        const [redditUser, storedNotes, queueItems, actionLogRaw] = await Promise.all([
          context.reddit.getUserByUsername(username),
          context.redis.get(REDIS_KEYS.notes(sub?.name ?? '', username)),
          loadQueue(context, sub?.name ?? ''),
          context.redis.get(REDIS_KEYS.actionLog(sub?.name ?? '')),
        ]);

        const accountAgeDays = Math.floor(
          (Date.now() - (redditUser?.createdAt?.getTime() ?? Date.now())) / 86400000,
        );

        const notes: ModNote[] = storedNotes ? (JSON.parse(storedNotes) as ModNote[]) : [];
        const userItems = queueItems.filter(i => i.author === username);
        const userItemIds = new Set(userItems.map(i => i.id));

        // Build modHistory from action log cross-referenced with this user's queue items
        type LogEntry = { itemId: string; action: string; reason?: string; mod: string; timestamp: number };
        const actionLog: LogEntry[] = actionLogRaw ? (JSON.parse(actionLogRaw) as LogEntry[]) : [];
        const modHistory = actionLog
          .filter(a => userItemIds.has(a.itemId))
          .slice(0, 20)
          .map(a => ({ action: a.action, mod: a.mod, reason: a.reason ?? '', timestamp: a.timestamp }));

        const isModerated = modHistory.some(h => h.action === 'ban' || h.action === 'mute');

        // Behavior patterns derived from real activity
        const behaviorPatterns: string[] = [];
        if (userItems.length >= 5) behaviorPatterns.push('High posting frequency');
        const commentCount = userItems.filter(i => i.type === 'comment').length;
        const postCount = userItems.filter(i => i.type === 'post').length;
        if (commentCount > postCount && commentCount > 2) behaviorPatterns.push('Comment-heavy activity');
        if (userItems.some(i => (i.aiScore?.spamScore ?? 0) >= 60)) behaviorPatterns.push('Spam pattern detected');
        if (modHistory.length > 0) behaviorPatterns.push(`${modHistory.length} prior mod action${modHistory.length !== 1 ? 's' : ''}`);

        const overallRisk: AIScore['riskLevel'] =
          userItems.some(i => (i.aiScore?.score ?? 0) >= 80) || isModerated ? 'HIGH' :
          accountAgeDays < 30 || modHistory.length > 0 ? 'MEDIUM' : 'LOW';

        send({
          type: 'USER_DATA',
          user: {
            username,
            karma: (redditUser?.linkKarma ?? 0) + (redditUser?.commentKarma ?? 0),
            accountAgeDays,
            isModerated,
            notes,
            recentActivity: userItems.map(i => ({
              id: i.id,
              type: i.type,
              title: i.title ?? '',
              body: i.body,
              createdAt: i.createdAt,
              status: i.status,
              aiScore: i.aiScore?.score,
              permalink: i.permalink,
            })),
            modHistory,
            riskProfile: {
              overallRisk,
              spamSignals: accountAgeDays < 7 ? ['New account (<7 days)'] : accountAgeDays < 30 ? ['New account (<30 days)'] : [],
              aiGenSignals: userItems.filter(i => (i.aiScore?.aiGenerated ?? 0) >= 70).length > 0
                ? ['AI content suspected']
                : [],
              behaviorPatterns,
            },
          },
        });
      } catch (err) {
        send({ type: 'ERROR', message: `Failed to load user: ${username}`, code: 'USER_NOT_FOUND' });
      }
      break;
    }

    // ── Config ────────────────────────────────────────────────────────────────
    case 'GET_CONFIG': {
      const config = await getConfig(context);
      send({ type: 'CONFIG_DATA', config });
      break;
    }

    case 'SAVE_CONFIG': {
      const existing = await getConfig(context);
      const updated: AppConfig = { ...existing, ...message.config };
      await saveConfig(context, updated);
      send({ type: 'CONFIG_SAVED', success: true });
      break;
    }

    case 'COMPLETE_SETUP': {
      const [user, sub] = await Promise.all([
        context.reddit.getCurrentUser(),
        context.reddit.getCurrentSubreddit(),
      ]);
      const existing = await getConfig(context);
      const updated: AppConfig = {
        ...existing,
        setupComplete: true,
        installedBy: user?.username ?? 'unknown',
      };
      await saveConfig(context, updated);

      // Seed default rules if not present
      const rulesKey = REDIS_KEYS.rules(sub?.name ?? '');
      const existingRules = await context.redis.get(rulesKey);
      if (!existingRules) {
        await context.redis.set(rulesKey, JSON.stringify(DEFAULT_RULES));
      }

      // Schedule weekly health digest once — skip if already scheduled
      if (!existing.setupComplete) {
        await context.scheduler.runJob({
          name: 'weekly-health-digest',
          cron: '0 9 * * 1',
          data: { subreddit: sub?.name ?? '' },
        });
      }

      send({ type: 'SETUP_COMPLETE' });
      break;
    }

    case 'OPEN_PERMALINK': {
      await context.ui.navigateTo(message.permalink);
      break;
    }
  }
}

// ─── PostCreate Trigger ───────────────────────────────────────────────────────

Devvit.addTrigger({
  event: 'PostCreate',
  onEvent: async (event, context) => {
    const subredditName = event.post.subredditName;
    const config = await getConfig(context);

    if (!config.autoScoreEnabled) return;

    const item = await buildQueueItemFromPost(context, event.post.id);
    if (!item) return;

    await upsertQueueItem(context, subredditName, item);

    // Score if API key present
    const apiKey = await context.settings.get<string>('anthropic-api-key');
    if (apiKey) {
      const score = await scoreContent(context, {
        content: item.body,
        title: item.title,
        apiKey,
        authorAge: item.authorAge,
        authorKarma: item.authorKarma,
      });

      item.aiScore = score;
      await upsertQueueItem(context, subredditName, item);

      // Apply rules if auto-action enabled
      if (config.autoActionEnabled) {
        const { matched } = await evaluateRules(context, item, score, subredditName);
        if (matched) {
          await applyRuleAction(context, item.id, item.author, subredditName, matched);
          await updateQueueItemStatus(
            context,
            subredditName,
            item.id,
            matched.action.type === 'approve' ? 'approved' : 'removed',
          );
        }
      }
    }
  },
});

// ─── CommentCreate Trigger ────────────────────────────────────────────────────

Devvit.addTrigger({
  event: 'CommentCreate',
  onEvent: async (event, context) => {
    const subredditName = event.comment.subredditName;
    const config = await getConfig(context);

    if (!config.autoScoreEnabled) return;

    const item = await buildQueueItemFromComment(context, event.comment.id);
    if (!item) return;

    // Only score comments with 100+ characters to avoid noise
    if (item.body.length < 100) return;

    await upsertQueueItem(context, subredditName, item);

    const apiKey = await context.settings.get<string>('anthropic-api-key');
    if (apiKey) {
      const score = await scoreContent(context, {
        content: item.body,
        apiKey,
        authorAge: item.authorAge,
        authorKarma: item.authorKarma,
      });

      item.aiScore = score;
      await upsertQueueItem(context, subredditName, item);

      if (config.autoActionEnabled) {
        const { matched } = await evaluateRules(context, item, score, subredditName);
        if (matched) {
          await applyRuleAction(context, item.id, item.author, subredditName, matched);
        }
      }
    }
  },
});

// ─── Scheduler Jobs ───────────────────────────────────────────────────────────

Devvit.addSchedulerJob({
  name: 'weekly-health-digest',
  onRun: async (event, context) => {
    const { subreddit } = event.data as { subreddit: string };
    if (!subreddit) return;

    const stats = await computeHealthStats(context, subreddit);

    const post = await context.reddit.submitPost({
      title: `📊 ModSentinel Weekly Health Report — r/${subreddit} — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
      subredditName: subreddit,
      text: buildHealthDigestText(stats),
    });

    // Pin the post for mods
    await context.reddit.distinguish(post.id, true);
  },
});

function buildHealthDigestText(stats: ReturnType<typeof Object.assign>): string {
  return `
## ModSentinel Weekly Health Report

**Period:** Last 7 days
**Generated:** ${new Date(stats.generatedAt).toUTCString()}

---

### Queue Overview
| Metric | Value |
|--------|-------|
| Current queue depth | ${stats.queueDepth} items |
| Posts removed | ${stats.removedPosts} |
| Removal rate | ${stats.removalRate}% |
| Suspected AI content | ${stats.aiGeneratedPercent}% of queue |

### Top Rule Violations
${stats.topViolations.map((v: { rule: string; count: number }) => `- **${v.rule}**: ${v.count} matches`).join('\n')}

### Most Actioned Users
${stats.mostActioned.map((u: { username: string; count: number }) => `- u/${u.username} (${u.count} actions)`).join('\n')}

---
*Generated automatically by [ModSentinel](https://developers.reddit.com) — AI-powered mod command center*
`.trim();
}

// ─── Menu Items ───────────────────────────────────────────────────────────────

Devvit.addMenuItem({
  label: '🛡️ Open ModSentinel Dashboard',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const sub = await context.reddit.getCurrentSubreddit();
    const config = await getConfig(context);

    if (config.dashboardPostId) {
      const post = await context.reddit.getPostById(config.dashboardPostId);
      await context.ui.navigateTo(post.url);
      return;
    }

    // Create the dashboard post
    const user = await context.reddit.getCurrentUser();
    const post = await context.reddit.submitPost({
      title: `🛡️ ModSentinel — Moderation Command Center`,
      subredditName: sub?.name ?? '',
      preview: (
        <vstack height="100%" width="100%" alignment="center middle" backgroundColor="#0f1116">
          <text color="#ff4500" size="xlarge" weight="bold">🛡️ ModSentinel</text>
          <text color="#818384" size="medium">Loading AI moderation dashboard…</text>
        </vstack>
      ),
    });

    // Store the dashboard post ID
    const updated: AppConfig = {
      ...config,
      dashboardPostId: post.id,
      installedBy: user?.username ?? 'unknown',
    };
    await saveConfig(context, updated);

    context.ui.showToast({ text: '✅ ModSentinel dashboard created!' });
    await context.ui.navigateTo(post.url);
  },
});

Devvit.addMenuItem({
  label: '🔍 Score This Post (ModSentinel)',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const apiKey = await context.settings.get<string>('anthropic-api-key');
    if (!apiKey) {
      context.ui.showToast({ text: '⚠️ Add your Anthropic API key in app settings first' });
      return;
    }

    context.ui.showToast({ text: '🤖 Scoring post…' });

    const post = await context.reddit.getPostById(event.targetId);
    const score = await scoreContent(context, {
      content: post.body ?? post.selftext ?? '',
      title: post.title,
      apiKey,
    });

    const sub = await context.reddit.getCurrentSubreddit();
    await context.redis.set(REDIS_KEYS.score(sub?.name ?? '', event.targetId), JSON.stringify(score));

    const riskEmoji: Record<string, string> = {
      CRITICAL: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🟢',
      SAFE: '✅',
    };

    context.ui.showToast({
      text: `${riskEmoji[score.riskLevel] ?? '⚪'} ${score.riskLevel} — Score: ${score.score}/100 | AI: ${score.aiGenerated}% | Spam: ${score.spamScore}%`,
    });
  },
});

Devvit.addMenuItem({
  label: '📋 View User in ModSentinel',
  location: 'post',
  forUserType: 'moderator',
  onPress: async (event, context) => {
    const post = await context.reddit.getPostById(event.targetId);
    const config = await getConfig(context);

    if (config.dashboardPostId) {
      const dashPost = await context.reddit.getPostById(config.dashboardPostId);
      context.ui.showToast({ text: `Open the ModSentinel dashboard and search for u/${post.authorName}` });
      await context.ui.navigateTo(dashPost.url);
    } else {
      context.ui.showToast({ text: '⚠️ Create a ModSentinel dashboard first (subreddit menu)' });
    }
  },
});

export default Devvit;
