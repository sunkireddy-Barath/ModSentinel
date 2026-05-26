# ModSentinel — AI-Powered Reddit Moderation Command Center

> **Devvit Hackathon 2025 · Reddit Mod Tools & Migrated Apps**
> Competing in: **Best New Mod Tool** · **Best Ported App** · **Moderator's Choice**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Try%20Now-FF4500?style=for-the-badge&logo=vercel)](https://webroot-wheat.vercel.app)
[![Devvit App](https://img.shields.io/badge/Reddit%20App-modsentinel-FF4500?style=for-the-badge&logo=reddit)](https://developers.reddit.com/apps/modsentinel)
[![Built with Devvit](https://img.shields.io/badge/Built%20with-Devvit%20v0.11-red?style=for-the-badge)](https://developers.reddit.com)
[![ContextMod Port](https://img.shields.io/badge/Port%20of-ContextMod%20700%2B%20stars-22c55e?style=for-the-badge)](https://github.com/FoxxMD/context-mod)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

---

## Links

| | URL |
|---|---|
| **Interactive Demo** | https://webroot-wheat.vercel.app |
| **Reddit Developer App Page** | https://developers.reddit.com/apps/modsentinel |
| **Source Code** | https://github.com/Sunkireddy_Barath/ModSentinel |
| **ContextMod (ported from)** | https://github.com/FoxxMD/context-mod |

> The **Interactive Demo** is a fully functional React app with a realistic mocked backend. Every button, rule builder, health chart, and user profile works — no Reddit account or API key required. Open it and start triaging.

---

## What Is ModSentinel?

ModSentinel is a **one-install Devvit app** that replaces the fragmented, manual Reddit moderation workflow with an AI-powered command center that runs entirely inside Reddit — no server to host, no bot to maintain, no external dashboard to juggle.

Every new post and comment is automatically scored by **Claude Haiku** for AI-generated content and spam. Moderators see a risk-ranked queue with context already filled in, take action in one click (or one keypress), build automation rules visually, and track community health with live charts.

---

## Who Benefits

| Audience | How ModSentinel Helps |
|---|---|
| **Small subreddit mods** | Zero setup complexity. Install, add API key, done. Rules fire automatically. No bot hosting, no YAML files, no server. |
| **Large subreddit mod teams** | Shared mod notes and user profiles keep the whole team in sync. Collaborative triage without duplicate work or missed context. |
| **Mods fighting AI spam** | The only Devvit tool with Claude Haiku AI detection. Catches AI-generated content that passes keyword filters and slips past basic automoderator. |
| **Power mods running 10+ subs** | Keyboard-driven queue (j/k/a/r/h/?) lets you triage 50 items without touching a mouse. Per-user risk profiles give history in seconds. |
| **Mods porting from ContextMod** | Same rule schema. Recreate existing ContextMod YAML rules in the visual UI without learning new syntax. Zero hosting cost vs. self-hosted server. |

---

## Features

### 1. AI Triage Queue
Every new post and comment is scored in real time by Claude Haiku. The queue shows risk level (CRITICAL / HIGH / MEDIUM / LOW / SAFE), AI percentage, spam percentage, and human-readable risk signals ("repetitive phrasing", "generic positive sentiment", "lacks personal voice"). One-click actions: **Remove · Approve · Hold · Ban · Mute · Lock**. Keyboard shortcuts for power mods.

### 2. Visual Rule Builder
No-code rule editor. Build conditions on 8 fields (account age, karma, AI score, spam score, post frequency, comment frequency, report count, cross-sub activity) and assign actions (remove, approve, hold, ban, mute, report, lock, distinguish, flair). Drag-and-drop priority ordering. Rules fire automatically on every new post/comment when auto-enforcement is on. ContextMod-compatible schema — existing rules port directly.

### 3. Collaborative Mod Notes
Shared notes on users, posts, and comments. Synced across the entire mod team via Devvit Redis and written to Reddit's native mod notes API. Six label types: spam · abuse · warning · helpful · watch · info. Notes persist and are visible to every mod on the team.

### 4. Community Health Pulse
7-day trend charts (Recharts). Tracks: total content reviewed, AI content rate, spam rate, top rule violations, mod team activity breakdown, average review time, and auto-action rate. Every Monday at 9 AM a weekly health digest is auto-posted as a distinguished mod post — mods get the report without having to open the dashboard.

### 5. User Profile View
Click any username in the queue to open a full risk profile: account age, karma, risk level badge, spam/AI/behavior signal badges, recent post and comment history with individual AI scores, and complete mod action history for that user in the subreddit. Full context in under 5 seconds.

### 6. Context Menu Actions
Five mod menu items available from any subreddit page or post/comment without opening the dashboard:
- "Open ModSentinel Dashboard" (subreddit menu)
- "Score This Post" (post menu)
- "Score This Comment" (comment menu)
- "View User in ModSentinel" (post or comment menu — opens user profile directly)

---

## What Makes It Different (Novelty)

### vs. AutoModerator (Reddit built-in)
| | AutoModerator | ModSentinel |
|---|---|---|
| AI content detection | No | Yes — Claude Haiku |
| Rule editor | YAML config file | Visual no-code UI |
| User risk profiles | No | Yes |
| Collaborative mod notes | No | Yes (+ synced to Reddit API) |
| Community health analytics | No | Yes — 7-day trend charts |
| Cross-team coordination | No | Yes — shared queue + notes |

### vs. ContextMod (self-hosted Python bot)
| | ContextMod | ModSentinel |
|---|---|---|
| Hosting | Self-hosted server + docker-compose | Zero infrastructure (Devvit serverless) |
| Configuration | YAML config files via wiki | Visual rule builder |
| AI content detection | No | Yes — Claude Haiku |
| Analytics dashboard | No | Yes — 7-day health charts |
| Mod notes | No | Yes — Reddit native API |
| Install time | Hours (server setup) | Under 2 minutes |

### vs. Other Devvit Mod Tools
Every existing Devvit mod tool does **one thing** (spam filter, note taker, vote bot). ModSentinel is the first to combine AI scoring + rule automation + notes + analytics + user profiles into a **single install** — a complete command center, not a single feature.

### Core Innovation: AI-Native Moderation
ModSentinel is the **first Devvit app to use a large language model for content moderation**. Claude Haiku evaluates the full text of each post/comment and returns a structured score:

```json
{
  "aiScore": 87,
  "spamScore": 23,
  "riskLevel": "HIGH",
  "signals": ["repetitive phrasing", "generic positive sentiment", "lacks personal voice"],
  "explanation": "Content exhibits high probability of AI generation..."
}
```

This catches AI-generated content that automoderator misses entirely — content that is grammatically correct, doesn't trigger keyword filters, and looks human on the surface.

---

## System Architecture

```
   ┌────────────────────────────────────────────────────┐
   │                  REDDIT PLATFORM                   │
   │  Events: PostCreate · CommentCreate                │
   │          PostReport · CommentReport · AppInstall   │
   └──────────────────────┬─────────────────────────────┘
                          │  serverless triggers (zero infra)
                          ▼
   ┌───────────────────────────────────────────────────┐
   │             DEVVIT BACKEND  (src/)                │
   │                                                   │
   │  main.tsx                                         │
   │    routeMessage()  — 14 message types             │
   │    5 context menu items                           │
   │    weekly-health-digest cron (Mon 9 AM)           │
   │                                                   │
   │  utils/                                           │
   │    aiScorer.ts      Claude Haiku · AI%+Spam%      │
   │    ruleEngine.ts    ContextMod port (PRAW→API)    │
   │    actionHandler.ts remove/ban/mute/lock/report   │
   │    healthComputer.ts 7-day analytics + cache      │
   │    redisHelpers.ts  queue · notes · 24h counters  │
   │                                                   │
   │  Devvit Redis                                     │
   │    ms:queue:{sub}       ms:rules:{sub}            │
   │    ms:notes:{sub}:{id}  ms:health:{sub}           │
   │    ms:score:{sub}:{id}  ms:config:{sub}           │
   │    ms:actions:{sub}     ms:act24:{sub}:{user}     │
   └──────────────────────┬────────────────────────────┘
                          │  postMessage bridge
                          │  (14 msg types each direction)
                          ▼
   ┌───────────────────────────────────────────────────┐
   │       WEBVIEW  (React 18 + Vite 5 + Tailwind)     │
   │                                                   │
   │  App.tsx + useDevvit.ts (postMessage bridge)      │
   │                                                   │
   │  Dashboard    AI triage queue + keyboard nav      │
   │  RuleBuilder  visual no-code rule editor          │
   │  HealthPulse  Recharts 7-day trend charts         │
   │  UserProfile  risk profile + activity timeline    │
   │  ModNotes     collaborative notes + 6 labels      │
   │  Sidebar      navigation + queue depth badge      │
   │  Onboarding   4-step setup wizard                 │
   └──────────────────────┬────────────────────────────┘
                          │  HTTPS · api.anthropic.com
                          ▼
   ┌────────────────────────────────────────────────────┐
   │         ANTHROPIC API  (external, optional)        │
   │  claude-haiku-4-5-20251001                         │
   │  Returns: aiScore · spamScore · riskLevel          │
   │           signals[] · explanation                  │
   │  Fallback: keyword heuristics when unavailable     │
   └────────────────────────────────────────────────────┘

   DEMO (no Reddit account needed)
   webroot/ → Vercel → https://webroot-wheat.vercel.app
   devtest.html mocks all 14 message handlers
```

---

## Message Protocol (WebView ↔ Devvit)

```
WebView → Devvit          Devvit → WebView
────────────────          ────────────────
INIT                      INIT_RESPONSE
LOAD_QUEUE                QUEUE_DATA
SCORE_ITEM                SCORE_RESULT
TAKE_ACTION               ACTION_RESULT
ADD_NOTE                  NOTE_ADDED
GET_NOTES                 NOTES_DATA
LOAD_RULES                RULES_DATA
SAVE_RULES                RULES_SAVED
LOAD_HEALTH               HEALTH_DATA
LOAD_USER                 USER_DATA
GET_CONFIG                CONFIG_DATA
SAVE_CONFIG               CONFIG_SAVED
COMPLETE_SETUP            SETUP_COMPLETE
OPEN_PERMALINK            (opens Reddit tab)
```

---

## How to Use

### For Mods: Getting Started

1. **Install** — Subreddit → Mod Tools → Community Appearance → Apps → search "ModSentinel" → Install
2. **Add API key** — App Settings → paste your [Anthropic API key](https://console.anthropic.com) (free tier works)
3. **Open dashboard** — any subreddit page → right-click or mod menu → "Open ModSentinel Dashboard"
4. **Complete setup** — 4-step onboarding wizard (takes under 2 minutes)
5. **Start triaging** — new posts and comments will appear in the queue automatically with AI scores

### Daily Workflow

```
New content posted → auto-scored by Claude Haiku → appears in queue
    ↓
Mod opens dashboard → sees risk-ranked queue with signals
    ↓
Review item (keyboard: j/k to navigate, x to expand)
    ↓
Take action (a=approve  r=remove  h=hold  s=score again)
    ↓
Click username → full risk profile + mod history
    ↓
Add a team note → visible to all mods immediately
    ↓
Every Monday → weekly health digest auto-posted
```

### Rule Builder Workflow

1. Go to the **Rules** tab in the dashboard
2. Click **"Add Rule"** — choose conditions (e.g. `aiScore >= 80`)
3. Set the action (e.g. `report`) and priority
4. Toggle **"Auto-enforce"** in Settings to apply rules without mod review
5. Watch the match counter increment as rules fire on new content

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `j` | Next item in queue |
| `k` | Previous item in queue |
| `a` | Approve selected item |
| `r` | Remove selected item |
| `h` | Hold selected item |
| `s` | Re-score selected item |
| `x` | Expand / collapse item |
| `?` | Show keyboard help overlay |

---

## Deployment

### Deploy to Devvit (production)

```bash
# 1. Build the React WebView
cd web && npm install && npm run build

# 2. Upload to Reddit's developer platform
devvit upload

# 3. Install on your subreddit via Mod Tools → Apps
```

**App listing:** https://developers.reddit.com/apps/modsentinel

### Deploy Demo to Vercel (live preview)

```bash
cd webroot
vercel --prod --yes
# Live demo served from webroot/devtest.html
```

**Live demo:** https://webroot-wheat.vercel.app

### Local Development

```bash
# Hot-reload dev server
cd web && npm run dev
# Open: http://localhost:5173/devtest.html

# Or serve the production build
cd webroot && npx serve .
# Open: http://localhost:3000/devtest.html
```

---

## Prerequisites

- [Devvit CLI](https://developers.reddit.com/docs/cli): `npm i -g devvit`
- Node.js ≥ 18
- [Anthropic API key](https://console.anthropic.com) — free tier (Claude Haiku) works

---

## Triggers

| Trigger | When | What It Does |
|---------|------|-------------|
| `AppInstall` | First install | Seeds 5 default rules + initial config in Redis |
| `PostCreate` | Every new post | Scores with Claude Haiku; tracks 24h activity; applies rules |
| `CommentCreate` | Comments ≥ 100 chars | Same as PostCreate |
| `PostReport` | Post reported | Queues + scores the reported post immediately |
| `CommentReport` | Comment reported | Queues + scores the reported comment immediately |
| `weekly-health-digest` | Every Mon 9 AM | Posts distinguished mod report with 7-day health stats |

---

## Default Rules (ContextMod-compatible)

| # | Rule | Conditions | Action | On by Default |
|---|------|-----------|--------|--------------|
| 1 | New Account Spam Guard | `accountAge < 7d` AND `karma < 10` | Hold | Yes |
| 2 | AI Content Filter | `aiScore >= 80` | Report | Yes |
| 3 | Spam Burst Detection | `postsLast24h > 5` | Remove | Yes |
| 4 | Community-Flagged Content | `reportCount >= 3` | Hold | Yes |
| 5 | Cross-Subreddit Spam | `uniqueSubsLast24h > 8` | Report | No |

**Condition fields:** `accountAge` · `karma` · `aiScore` · `spamScore` · `postsLast24h` · `commentsLast24h` · `reportCount` · `uniqueSubsLast24h`

**Action types:** `remove` · `approve` · `hold` · `ban` · `mute` · `report` · `lock` · `distinguish` · `flair`

---

## Redis Schema

| Key | TTL | Max | Contents |
|-----|-----|-----|----------|
| `ms:queue:{sub}` | 7d/item | 200 items | Queue items with AI scores and risk levels |
| `ms:notes:{sub}:{id}` | Permanent | 50/thread | Mod notes with labels and author info |
| `ms:rules:{sub}` | Permanent | Unlimited | Rule definitions with match counters |
| `ms:health:{sub}` | 1h cache | 1 object | 7-day community health stats |
| `ms:score:{sub}:{id}` | 24h cache | 1 object | Claude Haiku score result |
| `ms:config:{sub}` | Permanent | 1 object | Setup state, flags, API key presence |
| `ms:actions:{sub}` | Permanent | 500 entries | Action log: who did what and when |
| `ms:act24:{sub}:{user}` | 48h | Rolling | Timestamp arrays for 24h activity counters |

---

## App Settings

| Setting | Scope | Default | Description |
|---------|-------|---------|-------------|
| `anthropic-api-key` | App (secret) | — | Claude Haiku API key for AI scoring |
| `auto-score-enabled` | Installation | On | Auto-score all new posts/comments |
| `auto-action-enabled` | Installation | Off | Auto-apply rule actions without mod review |

---

## ContextMod Port

ModSentinel is a **complete port** of [ContextMod](https://github.com/FoxxMD/context-mod) (MIT, 700+ stars) into the Devvit platform.

| ContextMod / PRAW | ModSentinel / Devvit |
|---|---|
| `praw.Reddit()` client | `context.reddit.*` methods |
| `Subreddit.mod.queue()` polling | `PostCreate` / `CommentCreate` triggers |
| `Redditor.submissions.new()` 24h | Redis rolling timestamp array (`ms:act24`) |
| Rule YAML config files | Visual rule builder UI + Redis |
| SQLite state | Devvit Redis |
| Self-hosted webhook server | Devvit serverless triggers |
| `Comment.mod.remove()` | `context.reddit.remove(itemId, false)` |
| `Subreddit.banned.add()` | `context.reddit.banUser({ ... })` |
| Wiki-page YAML | Visual UI (no YAML required) |
| `docker-compose` install | One-click Devvit install |

**Added beyond ContextMod:** Claude Haiku AI detection · community health charts · collaborative mod notes (Reddit native API) · per-user risk profiles with signal badges · weekly auto-digest · keyboard-driven triage queue

---

## File Structure

```
ModSentinel/
├── src/                     Devvit backend (TypeScript)
│   ├── main.tsx             App entry: triggers, menu items, scheduler, WebView
│   ├── types.ts             Message union types, Rule, UserProfile, ActionType
│   ├── constants.ts         Redis keys, thresholds, 5 default rules
│   └── utils/
│       ├── aiScorer.ts      Claude Haiku integration (AI% + spam% + signals)
│       ├── ruleEngine.ts    ContextMod rule evaluator (ported from PRAW)
│       ├── actionHandler.ts remove / ban / mute / lock / report / approve
│       ├── healthComputer.ts 7-day analytics with 1h Redis cache
│       └── redisHelpers.ts  Queue CRUD, rolling 24h activity counters
│
├── web/                     React WebView (builds → webroot/)
│   ├── src/
│   │   ├── App.tsx          State machine + message router
│   │   ├── components/
│   │   │   ├── Dashboard.tsx    AI triage queue + keyboard shortcuts
│   │   │   ├── RuleBuilder.tsx  Visual no-code rule editor
│   │   │   ├── HealthPulse.tsx  Recharts analytics (7-day trend)
│   │   │   ├── UserProfile.tsx  Risk profile + activity timeline
│   │   │   ├── ModNotes.tsx     Collaborative notes + label system
│   │   │   ├── Sidebar.tsx      Navigation + queue depth badge
│   │   │   └── Onboarding.tsx   4-step setup wizard
│   │   └── hooks/
│   │       └── useDevvit.ts postMessage bridge (runtime + devtest)
│   ├── public/
│   │   └── vercel.json      Redirect / → /devtest.html
│   ├── index.html           Devvit WebView entry
│   ├── devtest.html         Standalone demo with mock backend
│   └── vite.config.ts       Code splitting: 78KB shell + 517KB charts
│
├── webroot/                 Built output → Vercel demo
│   ├── index.html
│   ├── devtest.html
│   ├── vercel.json
│   └── assets/
│       ├── main-*.js        App shell  (78 KB)
│       ├── charts-*.js      Recharts   (517 KB, separate chunk)
│       └── icons-*.js       Lucide     (23 KB, separate chunk)
│
├── devvit.json              App manifest: name, version, description
├── package.json             Devvit CLI + TypeScript deps
└── README.md
```

---

## Devvit Patterns for Developers

**`TriggerContext` vs `Context`** — trigger handlers receive a narrower type. Cast to use utility functions typed to `Context`:
```typescript
const ctx = context as unknown as Context;
```

**`PostV2` field access** — `event.post.subredditName` doesn't exist on the proto. Use `event.subreddit?.name`.

**24h rolling counters** — don't use daily-reset counters; they break near midnight. Use timestamp arrays:
```typescript
const cutoff = Date.now() - 86_400_000;
log.posts = [...log.posts.filter(t => t > cutoff), Date.now()];
```

**`UserNoteLabel` enum** — `addModNote` only accepts: `'BOT_BAN' | 'PERMA_BAN' | 'BAN' | 'ABUSE_WARNING' | 'SPAM_WARNING' | 'SPAM_WATCH' | 'SOLID_CONTRIBUTOR' | 'HELPFUL_USER'`. Map custom labels before calling.

**WebView message wrapper** — Devvit wraps incoming messages: `{ type: 'devvit-message', data: { message: payload } }`. Handle both this wrapper (production) and unwrapped (devtest) in the bridge hook.

---

## Why It Wins

**Best New Mod Tool** — First Devvit app with LLM content scoring. Covers the #1 unmet need in 2025 (AI-generated spam). Cuts per-item review time from ~8 min to ~90 sec. Full command center in one install.

**Best Ported App** — Complete API translation of ContextMod (700+ stars, most-used external mod tool). Every PRAW call → Devvit API, every YAML config → visual UI. Substantial native additions: AI scoring, analytics, Reddit-native mod notes.

**Moderator's Choice** — Solves the real pain mod teams face daily. Works without any setup beyond an API key. Keyboard-driven for power mods. Collaborative tools that the whole team benefits from immediately.

---

## Attribution

Rule engine ported from [ContextMod](https://github.com/FoxxMD/context-mod) by @FoxxMD — MIT License.

AI scoring powered by [Anthropic Claude Haiku](https://www.anthropic.com) (`claude-haiku-4-5-20251001`).

---

*Devvit Hackathon 2025 · May 28, 2026 · 3,026 participants · $45,000 in prizes*
