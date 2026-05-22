import type { Context } from '@devvit/public-api';
import type { ActionType, Rule } from '../types.js';
import { REDIS_KEYS, ACTION_LOG_MAX } from '../constants.js';

interface ActionInput {
  itemId: string;
  action: ActionType;
  reason?: string;
  message?: string;
  banDuration?: number;
  subredditName?: string;
  authorUsername?: string;
}

interface ActionResult {
  success: boolean;
  error?: string;
}

interface LogEntry {
  itemId: string;
  action: string;
  reason?: string;
  mod: string;
  timestamp: number;
  automated: boolean;
}

export async function handleModAction(
  context: Context,
  input: ActionInput,
): Promise<ActionResult> {
  try {
    switch (input.action) {
      case 'remove':
        await context.reddit.remove(input.itemId, false);
        break;

      case 'approve':
        await context.reddit.approve(input.itemId);
        break;

      case 'hold':
        // Mark as held in Redis queue; does not make a Reddit API call
        // Real "hold" = approved but kept in mod queue
        await context.reddit.approve(input.itemId);
        break;

      case 'lock':
        await context.reddit.lock(input.itemId);
        break;

      case 'distinguish':
        await context.reddit.distinguish(input.itemId, false);
        break;

      case 'report':
        await context.reddit.report(input.itemId, {
          userReportReason: input.reason ?? 'Flagged by ModSentinel',
        });
        break;

      case 'ban': {
        if (!input.subredditName || !input.authorUsername) {
          throw new Error('subredditName and authorUsername required for ban');
        }
        await context.reddit.banUser({
          subredditName: input.subredditName,
          username: input.authorUsername,
          duration: input.banDuration,
          reason: input.reason ?? 'Banned by ModSentinel',
          message: input.message ?? 'Your account has been banned from this subreddit.',
          note: `ModSentinel ban — ${new Date().toISOString()}`,
        });
        break;
      }

      case 'mute': {
        if (!input.subredditName || !input.authorUsername) {
          throw new Error('subredditName and authorUsername required for mute');
        }
        await context.reddit.muteUser({
          subredditName: input.subredditName,
          username: input.authorUsername,
        });
        break;
      }

      case 'flair':
        // Post flair requires post-level context — skip silently
        break;

      default:
        throw new Error(`Unknown action: ${input.action}`);
    }

    return { success: true };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    return { success: false, error };
  }
}

export async function applyRuleAction(
  context: Context,
  itemId: string,
  authorUsername: string,
  subredditName: string,
  rule: Rule,
): Promise<ActionResult> {
  const { action } = rule;
  const result = await handleModAction(context, {
    itemId,
    action: action.type,
    reason: action.removalReason ?? action.reportReason,
    message: action.removalMessage ?? action.banMessage,
    banDuration: action.banDuration,
    subredditName,
    authorUsername,
  });

  // Log the automated action
  await logAction(context, subredditName, {
    itemId,
    action: action.type,
    reason: action.removalReason ?? action.reportReason,
    mod: 'ModSentinel (auto)',
    timestamp: Date.now(),
    automated: true,
  });

  return result;
}

export async function logAction(
  context: Context,
  subredditName: string,
  entry: LogEntry,
): Promise<void> {
  try {
    const key = REDIS_KEYS.actionLog(subredditName);
    const stored = await context.redis.get(key);
    const log: LogEntry[] = stored ? (JSON.parse(stored) as LogEntry[]) : [];
    log.unshift(entry);
    await context.redis.set(key, JSON.stringify(log.slice(0, ACTION_LOG_MAX)));
  } catch {
    // Non-critical; ignore logging failures
  }
}
