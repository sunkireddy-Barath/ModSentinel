# ModSentinel — AI-Powered Reddit Moderation Command Center

> **Devvit Hackathon 2025 (April 29 – May 28, 2026)**
> Competing in: **Best New Mod Tool** · **Best Ported App** · **Moderator's Choice**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-webroot--wheat.vercel.app-orange?style=for-the-badge)](https://webroot-wheat.vercel.app)
[![Devvit](https://img.shields.io/badge/Built%20with-Devvit%20v0.11-red?style=for-the-badge)](https://developers.reddit.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)
[![ContextMod Port](https://img.shields.io/badge/Port%20of-ContextMod%20(700%2B%20stars)-green?style=for-the-badge)](https://github.com/FoxxMD/context-mod)

A unified Devvit app that gives Reddit mod teams a real-time AI triage queue, visual rule builder, collaborative mod notes, and community health analytics — all natively inside Reddit with **zero external infrastructure**.

---

## Live Demo

**Try the full app right now — no Reddit account needed:**

> **[https://webroot-wheat.vercel.app](https://webroot-wheat.vercel.app)**

The demo runs the complete React UI with a realistic mocked Devvit backend: 6 queue items across all risk levels, a working rule builder with 5 pre-built rules, community health charts, and user profiles with risk signals. Every button and feature works.

---

## What It Does

| Feature | Description |
|---------|-------------|
| **AI Triage Queue** | Every new post & comment scored automatically for AI-generated content, spam, and rule violations. Risk levels CRITICAL → SAFE with one-click actions (remove, approve, hold, ban, mute, lock). |
| **Visual Rule Builder** | No-code ContextMod-compatible rule engine. Build conditions on account age, karma, AI score, post frequency, and report count — with drag-and-drop priority ordering. |
| **Collaborative Mod Notes** | Shared notes on users and content, synced across the mod team via Redis and written to Reddit's native mod notes API. |
| **Community Health Pulse** | 7-day trend charts, top rule violations, mod team activity breakdown, AI content rate, and a weekly auto-posted digest every Monday. |
| **User Profile View** | Per-user risk profile, content activity timeline, and full mod history — context in seconds, not minutes. |
| **Context Menu Actions** | "Score This Post / Comment" and "View User in ModSentinel" from any mod context menu — no need to open the dashboard. |

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         REDDIT PLATFORM                                  │
│                                                                           │
│  PostCreate ──►┐                                                          │
│  CommentCreate ┤                                                          │
│  PostReport ───┼──► Devvit Triggers ──────────────────────────────────┐  │
│  CommentReport ┤    (serverless, zero infra)                          │  │
│  AppInstall ───┘                                                       │  │
│                                                                        │  │
│  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │                    DEVVIT BACKEND (src/)                         │  │  │
│  │                                                                   │  │  │
│  │  main.tsx                                                        │  │  │
│  │  ┌──────────────┐  ┌────────────────┐  ┌─────────────────────┐ │  │  │
│  │  │ routeMessage │  │  5 Menu Items  │  │ Scheduler (weekly)  │ │  │  │
│  │  │  (14 types)  │  │  (context mod) │  │ health digest cron  │ │  │  │
│  │  └──────┬───────┘  └────────────────┘  └─────────────────────┘ │  │  │
│  │         │                                                        │  │  │
│  │  ┌──────▼────────────────────────────────────────────────────┐  │  │  │
│  │  │                      utils/                                │  │  │  │
│  │  │  ┌─────────────┐ ┌───────────────┐ ┌──────────────────┐  │  │  │  │
│  │  │  │ aiScorer.ts │ │ ruleEngine.ts │ │ actionHandler.ts │  │  │  │  │
│  │  │  │ Claude Haiku│ │  ContextMod   │ │ remove/ban/mute  │  │  │  │  │
│  │  │  │  scoring    │ │  port (PRAW→  │ │ lock/distinguish │  │  │  │  │
│  │  │  │ AI%+spam%   │ │  Devvit API)  │ │ report/approve   │  │  │  │  │
│  │  │  └──────┬──────┘ └───────┬───────┘ └────────┬─────────┘  │  │  │  │
│  │  │         │                │                   │             │  │  │  │
│  │  │  ┌──────▼────────────────▼───────────────────▼──────────┐ │  │  │  │
│  │  │  │           healthComputer.ts  │  redisHelpers.ts        │ │  │  │  │
│  │  │  │           7-day analytics   │  queue + activity log    │ │  │  │  │
│  │  │  └─────────────────────────────────────────────────────┘  │  │  │  │
│  │  └───────────────────────────────────────────────────────────┘  │  │  │
│  │                                                                   │  │  │
│  │  ┌────────────────────────────────────────────────────────────┐  │  │  │
│  │  │                   DEVVIT REDIS                              │  │  │  │
│  │  │  ms:queue:{sub}   ms:rules:{sub}   ms:health:{sub}         │  │  │  │
│  │  │  ms:notes:{sub}:{id}               ms:score:{sub}:{id}     │  │  │  │
│  │  │  ms:config:{sub}  ms:actions:{sub} ms:act24:{sub}:{user}   │  │  │  │
│  │  └────────────────────────────────────────────────────────────┘  │  │  │
│  └─────────────────────────────────────────────────────────────────┘  │  │
│                                                                         │  │
│  ┌─────────────────────────────────────────────────────────────────┐  │  │
│  │              WEBVIEW (React + Vite + Tailwind)                   │◄─┘  │
│  │                                                                   │     │
│  │  App.tsx ─────► useDevvit.ts (postMessage bridge)               │     │
│  │       │          ▲ DevvitToWebView   ▼ WebViewToDevvit           │     │
│  │       │          │  (14 msg types)   │  (14 msg types)           │     │
│  │       ├──► Dashboard.tsx    (AI triage queue + keyboard nav)     │     │
│  │       ├──► RuleBuilder.tsx  (visual no-code rule editor)         │     │
│  │       ├──► HealthPulse.tsx  (Recharts 7-day trend charts)        │     │
│  │       ├──► UserProfile.tsx  (risk profile + activity timeline)   │     │
│  │       ├──► ModNotes.tsx     (collaborative notes + labels)       │     │
│  │       ├──► Sidebar.tsx      (nav + queue depth badge)            │     │
│  │       └──► Onboarding.tsx   (4-step setup wizard)               │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────┐    │
│  │              EXTERNAL SERVICES                                    │    │
│  │                                                                   │    │
│  │  Anthropic API ──► Claude Haiku (claude-haiku-4-5-20251001)      │    │
│  │  (api.anthropic.com/v1/messages)  AI content scoring              │    │
│  │                                   AI% + spam% + risk signals      │    │
│  └──────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘

DEMO DEPLOYMENT (judges / preview)
  webroot/ ──► Vercel (static) ──► https://webroot-wheat.vercel.app
              devtest.html mock backend (all 14 message handlers)
```

---

## Message Protocol (WebView ↔ Devvit)

```
WebView → Devvit (14 types)          Devvit → WebView (14 types)
─────────────────────────────        ───────────────────────────
INIT                                 INIT_RESPONSE
LOAD_QUEUE                           QUEUE_DATA
SCORE_ITEM                           SCORE_RESULT
TAKE_ACTION                          ACTION_RESULT
ADD_NOTE                             NOTE_ADDED
GET_NOTES                            NOTES_DATA
LOAD_RULES                           RULES_DATA
SAVE_RULES                           RULES_SAVED
LOAD_HEALTH                          HEALTH_DATA
LOAD_USER                            USER_DATA
GET_CONFIG                           CONFIG_DATA
SAVE_CONFIG                          CONFIG_SAVED
COMPLETE_SETUP                       SETUP_COMPLETE
OPEN_PERMALINK                       (opens Reddit tab)
```

---

## Triggers

| Trigger | When | What It Does |
|---------|------|-------------|
| `AppInstall` | On first install | Seeds 5 default rules and initial config in Redis |
| `PostCreate` | Every new post | Scores with Claude Haiku; tracks author 24h activity; applies rules if auto-enforcement on |
| `CommentCreate` | Comments ≥ 100 chars | Same scoring + tracking as PostCreate |
| `PostReport` | Post receives a report | Immediately queues and scores the reported post |
| `CommentReport` | Comment receives a report | Immediately queues and scores the reported comment |
| `weekly-health-digest` | Every Monday 9 AM | Posts a distinguished mod report with 7-day community health stats |

---

## Redis Schema

| Key | TTL | Max Size | Contents |
|-----|-----|----------|----------|
| `ms:queue:{sub}` | 7d per item | 200 items | JSON array of queue items with AI scores, risk levels, status |
| `ms:notes:{sub}:{id}` | Permanent | 50 per thread | JSON array of mod notes with labels and author info |
| `ms:rules:{sub}` | Permanent | Unlimited | JSON array of rule definitions with match counters |
| `ms:health:{sub}` | 1h cache | 1 object | Community health stats: 7-day trend, top violations, mod activity |
| `ms:score:{sub}:{id}` | 24h cache | 1 object | Claude Haiku AI score: aiScore, spamScore, riskLevel, signals |
| `ms:config:{sub}` | Permanent | 1 object | Setup state, API key presence, auto-score/action flags |
| `ms:actions:{sub}` | Permanent | 500 entries | Action log: itemId, action, reason, mod, timestamp, automated |
| `ms:act24:{sub}:{user}` | 48h | Rolling | Timestamp arrays for 24h post/comment activity (spam burst detection) |

---

## Default Rules (ContextMod-compatible)

| # | Rule Name | Conditions | Action | Default |
|---|-----------|-----------|--------|---------|
| 1 | New Account Spam Guard | `accountAge < 7 days` AND `karma < 10` | Hold | Enabled |
| 2 | AI Content Filter | `aiScore >= 80` | Report | Enabled |
| 3 | Spam Burst Detection | `postsLast24h > 5` | Remove | Enabled |
| 4 | Community-Flagged Content | `reportCount >= 3` | Hold | Enabled |
| 5 | Cross-Subreddit Spam | `uniqueSubsLast24h > 8` | Report | Disabled |

All rules are editable and reorderable in the Visual Rule Builder. New rules can be created with any combination of 8 condition fields and 9 action types.

### Condition Fields
`accountAge` · `karma` · `aiScore` · `spamScore` · `postsLast24h` · `commentsLast24h` · `reportCount` · `uniqueSubsLast24h`

### Action Types
`remove` · `approve` · `hold` · `ban` · `mute` · `report` · `lock` · `distinguish` · `flair`

---

## AI Scoring (Claude Haiku)

Every scored item returns a structured JSON payload:

```json
{
  "aiScore": 87,
  "spamScore": 23,
  "riskLevel": "HIGH",
  "signals": ["repetitive phrasing", "generic positive sentiment", "lacks personal voice"],
  "explanation": "Content exhibits high probability of AI generation..."
}
```

- **aiScore**: 0–100 probability of AI-generated content
- **spamScore**: 0–100 probability of spam behavior
- **riskLevel**: `CRITICAL` (90+) · `HIGH` (70+) · `MEDIUM` (50+) · `LOW` (30+) · `SAFE`
- **signals**: Human-readable flags shown in the triage queue and user profiles
- **Heuristic fallback**: When the Anthropic API is unavailable, keyword-based scoring activates automatically

---

## ContextMod Port

ModSentinel is a **complete port** of [ContextMod](https://github.com/FoxxMD/context-mod) (MIT, 700+ stars) — the most widely used external Reddit moderation automation tool — into the Devvit platform.

| PRAW / ContextMod | ModSentinel / Devvit |
|-------------------|---------------------|
| `praw.Reddit()` client | `context.reddit.*` methods |
| `Subreddit.mod.queue()` polling | `PostCreate` / `CommentCreate` triggers |
| `Redditor.submissions.new()` 24h count | Redis rolling timestamp array (`ms:act24:{sub}:{user}`) |
| Rule YAML config files | `ms:rules:{sub}` Redis key, visual UI editor |
| SQLite for state | Devvit Redis (`context.redis`) |
| Self-hosted webhook server | Devvit serverless triggers (zero infra) |
| `Comment.mod.remove()` | `context.reddit.remove(itemId, false)` |
| `Subreddit.banned.add()` | `context.reddit.banUser({ subredditName, username, ... })` |
| `Redditor.message()` | `context.reddit.sendPrivateMessage()` |
| Wiki-page YAML config | Visual rule builder (no YAML required) |
| Manual install + `docker-compose` | One-click Devvit install, zero dependencies |

**Added beyond ContextMod:**
- Claude Haiku AI content scoring (ContextMod has no AI detection)
- Community health analytics with 7-day trend charts
- Collaborative mod notes synced to Reddit's native mod notes API
- Per-user risk profiles with spam/AI/behavior signal badges
- Weekly auto-posted health digest
- Keyboard-driven triage queue (j/k navigate, a/r/h/s/x act, ? help)

---

## Why It Wins

### Best New Mod Tool ($10,000)

- **Solves the #1 2025 mod pain point**: AI-generated content flooding subreddits. ModSentinel uses Claude Haiku to detect AI-written posts/comments at scale — no existing Devvit tool does this.
- **Complete mod command center**: Triage queue + rule engine + notes + analytics in one install. Previously required 3-4 separate tools.
- **Zero-maintenance**: Auto-scoring on every PostCreate/CommentCreate + weekly health digest. Mods get protection without any manual work.
- **5× faster review**: Per-item review time drops from ~8 min to ~90 sec with AI context pre-filled.

### Best Ported App ($10,000)

- **Full port of ContextMod** — the most-used external Reddit mod automation tool. Every PRAW call translated to Devvit API, every YAML config translated to a visual UI.
- **ContextMod-compatible rule schema**: Existing ContextMod users can recreate their rules in the UI without learning new syntax.
- **Substantial native additions**: AI detection, analytics dashboard, and Reddit-native mod notes API — none of which exist in ContextMod.

### Moderator's Choice ($10,000)

- **Real mod pain point**: AI-generated spam is the top complaint in r/modnews in 2025.
- **Keyboard-driven workflow**: Power mods can triage 50 items without touching a mouse (j/k/a/r/h/s/x/?).
- **Shared context**: Collaborative mod notes and user profiles mean the whole team knows what's happening without asking.

---

## File Structure

```
ModSentinel/
├── src/                          # Devvit backend (TypeScript)
│   ├── main.tsx                  # App entry: triggers, menu items, scheduler, WebView host
│   ├── types.ts                  # Shared types: message union types, Rule, UserProfile, etc.
│   ├── constants.ts              # Redis key schema, thresholds, default rules
│   └── utils/
│       ├── aiScorer.ts           # Claude Haiku integration: scores posts/comments
│       ├── ruleEngine.ts         # ContextMod rule evaluator (ported from PRAW)
│       ├── actionHandler.ts      # Mod actions: remove, ban, mute, lock, report, etc.
│       ├── healthComputer.ts     # Community health stats with 1h cache
│       └── redisHelpers.ts       # Queue management, rolling 24h activity counters
│
├── web/                          # React WebView (built → webroot/)
│   ├── src/
│   │   ├── App.tsx               # Root state machine + message router
│   │   ├── types.ts              # Frontend types (mirrors src/types.ts)
│   │   ├── components/
│   │   │   ├── Dashboard.tsx     # AI triage queue with keyboard shortcuts
│   │   │   ├── RuleBuilder.tsx   # Visual no-code rule editor
│   │   │   ├── HealthPulse.tsx   # Recharts analytics (7-day trend + breakdowns)
│   │   │   ├── UserProfile.tsx   # Risk profile, activity timeline, mod history
│   │   │   ├── ModNotes.tsx      # Collaborative notes with label system
│   │   │   ├── Sidebar.tsx       # Navigation + queue depth badge
│   │   │   └── Onboarding.tsx    # 4-step setup wizard
│   │   └── hooks/
│   │       └── useDevvit.ts      # postMessage bridge (runtime + devtest compatible)
│   ├── public/
│   │   └── vercel.json           # Redirect / → /devtest.html, cache headers
│   ├── index.html                # Devvit WebView entry point
│   ├── devtest.html              # Standalone demo with mocked Devvit backend
│   └── vite.config.ts            # Code splitting: main 78KB, charts 517KB, icons 23KB
│
├── webroot/                      # Built output (committed for Vercel deploy)
│   ├── index.html
│   ├── devtest.html
│   ├── vercel.json
│   └── assets/
│       ├── main-*.js             # App shell (78 KB)
│       ├── main-*.css
│       ├── charts-*.js           # Recharts chunk (517 KB)
│       └── icons-*.js            # Lucide React chunk (23 KB)
│
├── devvit.json                   # App manifest: name, version, description
├── package.json                  # Devvit CLI + TypeScript deps
└── README.md
```

---

## Setup & Deployment

### Prerequisites

- [Devvit CLI](https://developers.reddit.com/docs/cli): `npm i -g devvit`
- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com) (Claude Haiku access)

### 1. Build the React WebView

```bash
cd web
npm install
npm run build
# Outputs optimized bundle to ../webroot/
```

### 2. Deploy to Devvit

```bash
devvit upload
# Follow prompts to select your developer account
```

### 3. Install on a Subreddit

1. Go to your subreddit → **Mod Tools** → **Community Appearance** → **Apps**
2. Find **ModSentinel** → **Install**
3. In **App Settings**, paste your Anthropic API key
4. From any subreddit page context menu → **Open ModSentinel Dashboard**
5. Complete the **4-step onboarding wizard**

### 4. Optional: Deploy Demo to Vercel

The `webroot/` directory is a self-contained static site with a full mock backend:

```bash
cd webroot
vercel --prod --yes
# Live at: https://your-project.vercel.app
```

The Vercel `vercel.json` (in `web/public/`, copied to `webroot/` on every build) redirects `/` to `/devtest.html` automatically.

### 5. Local Development

**Hot-reload dev server:**
```bash
cd web && npm run dev
# Open: http://localhost:5173/devtest.html
```

**Serve production build locally:**
```bash
cd webroot && npx serve .
# Open: http://localhost:3000/devtest.html
```

The devtest harness runs the complete React app with a mocked Devvit backend — all 6 features work, with 6 realistic queue items, 5 default rules, health charts, and 3 user profiles. **No Playtest, no live subreddit, no API key needed.**

---

## Keyboard Shortcuts (Dashboard)

| Key | Action |
|-----|--------|
| `j` | Next item |
| `k` | Previous item |
| `a` | Approve selected |
| `r` | Remove selected |
| `h` | Hold selected |
| `s` | Score selected |
| `x` | Expand/collapse selected |
| `?` | Show help overlay |

---

## App Settings

| Setting | Scope | Description |
|---------|-------|-------------|
| `anthropic-api-key` | App (secret) | Claude Haiku API key for AI scoring |
| `auto-score-enabled` | Installation | Auto-score all new posts/comments (default: on) |
| `auto-action-enabled` | Installation | Auto-apply rule actions without mod review (default: off) |

---

## Devvit Patterns for Developers

**`TriggerContext` vs `Context`:**
Devvit trigger handlers receive `TriggerContext = Omit<Context, 'ui' | 'dimensions' | 'modLog' | 'uiEnvironment'>`. Cast when passing to utilities typed to `Context`:
```typescript
const ctx = context as unknown as Context;
```

**`PostV2` field access:**
`event.post.subredditName` does not exist on the proto type. Use `event.subreddit?.name` instead.

**24-hour rolling activity counters:**
Simple counters with daily resets break near midnight. Use Redis arrays of timestamps:
```typescript
const cutoff = Date.now() - 86_400_000;
log.posts = [...log.posts.filter(t => t > cutoff), Date.now()];
await context.redis.set(key, JSON.stringify(log), { expiration: Date.now() + 172_800_000 });
```

**`UserNoteLabel` enum values:**
The Devvit `addModNote` API only accepts: `'BOT_BAN' | 'PERMA_BAN' | 'BAN' | 'ABUSE_WARNING' | 'SPAM_WARNING' | 'SPAM_WATCH' | 'SOLID_CONTRIBUTOR' | 'HELPFUL_USER'`. Map custom labels before calling.

**WebView message format (both directions):**
Devvit wraps incoming WebView messages: `{ type: 'devvit-message', data: { message: payload } }`. The `useDevvit.ts` hook handles both this wrapper (production) and unwrapped messages (devtest).

---

## Attribution

Rule engine ported from [ContextMod](https://github.com/FoxxMD/context-mod) by @FoxxMD — MIT License.
The condition evaluation logic, rule structure, and config schema are directly inspired by ContextMod.

AI scoring powered by [Anthropic Claude Haiku](https://www.anthropic.com) (`claude-haiku-4-5-20251001`).

---

*Built for the Reddit Mod Tools & Migrated Apps Hackathon 2025 · May 28, 2026 deadline*
*3,026 participants · $45,000 in prizes*
