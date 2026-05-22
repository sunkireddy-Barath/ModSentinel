export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'SAFE';

export interface AIScore {
  score: number;          // 0–100, higher = riskier
  riskLevel: RiskLevel;
  signals: string[];
  aiGenerated: number;   // 0–100 probability of AI-generated content
  spamScore: number;     // 0–100
  reasoning: string;
  scoredAt: number;      // unix ms
}

export interface QueueItem {
  id: string;
  type: 'post' | 'comment';
  title?: string;
  body: string;
  author: string;
  authorKarma: number;
  authorAge: number;     // days since account creation
  subreddit: string;
  url: string;
  permalink: string;
  createdAt: number;
  reportCount: number;
  reportReasons: string[];
  aiScore?: AIScore;
  status: 'pending' | 'approved' | 'removed' | 'held';
}

export type NoteLabel = 'spam' | 'abuse' | 'warning' | 'helpful' | 'watch' | 'info';

export interface ModNote {
  id: string;
  thingId: string;
  thingType: 'post' | 'comment' | 'user';
  authorMod: string;
  content: string;
  label: NoteLabel;
  createdAt: number;
}

export type ConditionField =
  | 'account_age'
  | 'karma'
  | 'post_count_24h'
  | 'comment_count_24h'
  | 'cross_sub_count_24h'
  | 'ai_score'
  | 'spam_score'
  | 'report_count'
  | 'body_contains'
  | 'title_contains'
  | 'flair_text';

export type ConditionOperator = 'lt' | 'gt' | 'lte' | 'gte' | 'eq' | 'contains' | 'not_contains' | 'matches_regex';

export interface RuleCondition {
  field: ConditionField;
  operator: ConditionOperator;
  value: string | number;
}

export type ActionType = 'remove' | 'approve' | 'report' | 'hold' | 'ban' | 'mute' | 'flair' | 'lock' | 'distinguish';

export interface RuleAction {
  type: ActionType;
  removalReason?: string;
  removalMessage?: string;
  banDuration?: number;   // days; undefined = permanent
  banMessage?: string;
  flairText?: string;
  flairCssClass?: string;
  reportReason?: string;
}

export interface Rule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  appliesTo: 'posts' | 'comments' | 'both';
  conditions: RuleCondition[];
  conditionLogic: 'AND' | 'OR';
  action: RuleAction;
  priority: number;        // lower = runs first
  matchCount: number;      // how many times this rule has fired
}

export interface HealthTrendPoint {
  date: string;           // YYYY-MM-DD
  removed: number;
  approved: number;
  aiSuspected: number;
  queueDepth: number;
}

export interface RecentAction {
  itemId: string;
  action: string;
  mod: string;
  automated: boolean;
  timestamp: number;
}

export interface HealthStats {
  subreddit: string;
  generatedAt: number;
  totalPosts: number;
  totalComments: number;
  removedPosts: number;
  removedComments: number;
  removalRate: number;
  aiGeneratedSuspected: number;
  aiGeneratedPercent: number;
  topViolations: Array<{ rule: string; count: number }>;
  mostActioned: Array<{ username: string; count: number }>;
  queueDepth: number;
  avgReviewTimeMins: number;
  modActivity: Array<{ mod: string; actions: number }>;
  trend: HealthTrendPoint[];
  recentActions: RecentAction[];
}

export interface AppConfig {
  subreddit: string;
  setupComplete: boolean;
  anthropicApiKeySet: boolean;
  autoScoreEnabled: boolean;
  autoActionEnabled: boolean;
  dashboardPostId?: string;
  installedAt: number;
  installedBy: string;
}

export interface UserActivity {
  id: string;
  type: 'post' | 'comment';
  title: string;
  body: string;
  createdAt: number;
  status: 'active' | 'removed' | 'approved';
  aiScore?: number;
  permalink: string;
}

export interface UserModHistory {
  action: string;
  mod: string;
  reason: string;
  timestamp: number;
  details?: string;
}

export interface UserProfile {
  username: string;
  karma: number;
  accountAgeDays: number;
  isModerated: boolean;
  recentActivity: UserActivity[];
  modHistory: UserModHistory[];
  notes: ModNote[];
  riskProfile: {
    overallRisk: RiskLevel;
    spamSignals: string[];
    aiGenSignals: string[];
    behaviorPatterns: string[];
  };
}

// ─── WebView ↔ Devvit message protocol ───────────────────────────────────────

export type WebViewToDevvit =
  | { type: 'INIT' }
  | { type: 'LOAD_QUEUE' }
  | { type: 'SCORE_ITEM'; itemId: string; itemType: 'post' | 'comment'; title?: string; body: string }
  | { type: 'TAKE_ACTION'; itemId: string; action: ActionType; reason?: string; message?: string; banDuration?: number }
  | { type: 'ADD_NOTE'; thingId: string; thingType: 'post' | 'comment' | 'user'; content: string; label: NoteLabel }
  | { type: 'GET_NOTES'; thingId: string }
  | { type: 'SAVE_RULES'; rules: Rule[] }
  | { type: 'LOAD_RULES' }
  | { type: 'LOAD_HEALTH' }
  | { type: 'LOAD_USER'; username: string }
  | { type: 'GET_CONFIG' }
  | { type: 'SAVE_CONFIG'; config: Partial<AppConfig> }
  | { type: 'COMPLETE_SETUP' }
  | { type: 'OPEN_PERMALINK'; permalink: string };

export type DevvitToWebView =
  | { type: 'INIT_DATA'; config: AppConfig; username: string; isMod: boolean; subreddit: string }
  | { type: 'QUEUE_DATA'; items: QueueItem[]; total: number }
  | { type: 'SCORE_RESULT'; itemId: string; score: AIScore }
  | { type: 'ACTION_COMPLETE'; itemId: string; action: string; success: boolean; error?: string }
  | { type: 'NOTE_SAVED'; note: ModNote }
  | { type: 'NOTES_DATA'; thingId: string; notes: ModNote[] }
  | { type: 'RULES_DATA'; rules: Rule[] }
  | { type: 'RULES_SAVED'; rules: Rule[]; success: boolean }
  | { type: 'HEALTH_DATA'; stats: HealthStats }
  | { type: 'USER_DATA'; user: UserProfile }
  | { type: 'CONFIG_DATA'; config: AppConfig }
  | { type: 'CONFIG_SAVED'; success: boolean }
  | { type: 'SETUP_COMPLETE' }
  | { type: 'ERROR'; message: string; code?: string };
