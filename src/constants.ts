import type { Rule } from './types.js';

export const REDIS_PREFIX = 'ms';

export const REDIS_KEYS = {
  config: (sub: string) => `${REDIS_PREFIX}:config:${sub}`,
  queue: (sub: string) => `${REDIS_PREFIX}:queue:${sub}`,
  notes: (sub: string, thingId: string) => `${REDIS_PREFIX}:notes:${sub}:${thingId}`,
  rules: (sub: string) => `${REDIS_PREFIX}:rules:${sub}`,
  health: (sub: string) => `${REDIS_PREFIX}:health:${sub}`,
  score: (sub: string, thingId: string) => `${REDIS_PREFIX}:score:${sub}:${thingId}`,
  actionLog: (sub: string) => `${REDIS_PREFIX}:actions:${sub}`,
  userActivity: (sub: string, username: string) => `${REDIS_PREFIX}:user:${sub}:${username}`,
  activityLog: (sub: string, username: string) => `${REDIS_PREFIX}:act24:${sub}:${username}`,
  schedulerLock: (sub: string) => `${REDIS_PREFIX}:lock:${sub}`,
} as const;

export const QUEUE_MAX_SIZE = 200;
export const NOTES_MAX_PER_THING = 50;
export const ACTION_LOG_MAX = 500;
export const SCORE_TTL_MS = 24 * 60 * 60 * 1000;         // 24 hours
export const HEALTH_CACHE_TTL_MS = 60 * 60 * 1000;       // 1 hour
export const QUEUE_ITEM_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const ACTIVITY_TRACK_TTL_SECONDS = 2 * 24 * 60 * 60; // 48 hours
export const ACTIVITY_WINDOW_MS = 24 * 60 * 60 * 1000;   // 24-hour rolling window

export const RISK_THRESHOLDS = {
  CRITICAL: 85,
  HIGH: 65,
  MEDIUM: 40,
  LOW: 15,
} as const;

export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
export const ANTHROPIC_SCORING_TOKENS = 400;

export const DEFAULT_RULES: Rule[] = [
  {
    id: 'rule_new_account_spam',
    name: 'New Account Spam Guard',
    description: 'Hold posts from accounts younger than 7 days with low karma',
    enabled: true,
    appliesTo: 'posts',
    conditionLogic: 'AND',
    conditions: [
      { field: 'account_age', operator: 'lt', value: 7 },
      { field: 'karma', operator: 'lt', value: 10 },
    ],
    action: {
      type: 'hold',
      removalReason: 'New account review',
    },
    priority: 1,
    matchCount: 0,
  },
  {
    id: 'rule_ai_content',
    name: 'AI-Generated Content Filter',
    description: 'Report likely AI-generated posts for manual review',
    enabled: true,
    appliesTo: 'both',
    conditionLogic: 'AND',
    conditions: [
      { field: 'ai_score', operator: 'gte', value: 80 },
    ],
    action: {
      type: 'report',
      reportReason: 'Suspected AI-generated content — review required',
    },
    priority: 2,
    matchCount: 0,
  },
  {
    id: 'rule_spam_burst',
    name: 'Spam Burst Detection',
    description: 'Remove accounts posting too many times in 24 hours',
    enabled: true,
    appliesTo: 'posts',
    conditionLogic: 'AND',
    conditions: [
      { field: 'post_count_24h', operator: 'gt', value: 5 },
    ],
    action: {
      type: 'remove',
      removalReason: 'Spam — posting too frequently',
      removalMessage: 'Your submission has been removed due to excessive posting. Please allow time between submissions.',
    },
    priority: 3,
    matchCount: 0,
  },
  {
    id: 'rule_high_reports',
    name: 'Community-Flagged Content',
    description: 'Hold content that has received 3+ community reports',
    enabled: true,
    appliesTo: 'both',
    conditionLogic: 'AND',
    conditions: [
      { field: 'report_count', operator: 'gte', value: 3 },
    ],
    action: {
      type: 'hold',
      removalReason: 'Multiple community reports — pending review',
    },
    priority: 4,
    matchCount: 0,
  },
  {
    id: 'rule_cross_sub_spam',
    name: 'Cross-Subreddit Spam',
    description: 'Flag users who have posted the same content across many subs',
    enabled: false,
    appliesTo: 'posts',
    conditionLogic: 'AND',
    conditions: [
      { field: 'cross_sub_count_24h', operator: 'gt', value: 8 },
    ],
    action: {
      type: 'report',
      reportReason: 'Cross-subreddit spam pattern detected',
    },
    priority: 5,
    matchCount: 0,
  },
];
