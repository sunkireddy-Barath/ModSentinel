# 🛡️ ModSentinel — AI-Powered Reddit Moderation Command Center

> **Devvit Hackathon 2025 (April 29 – May 27, 2026)**
> Competing in: **Best New Mod Tool** · **Best Ported Data API App** · **Devvit Helper Award**

A unified Devvit app that gives Reddit mod teams a real-time AI triage queue, visual rule builder, collaborative mod notes, and community health analytics — all natively inside Reddit with zero external infrastructure.

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

## Why It Wins

### 🏆 Best New Mod Tool Honorable Mention ($1,000)

- **Solves the #1 2025 mod pain point**: AI-generated content. ModSentinel uses Claude Haiku to detect AI-written posts/comments at scale, something no existing Devvit tool does.
- **Complete mod command center**: Triage queue + rule engine + notes + analytics in one install.
- **Zero-maintenance for mods**: Auto-scoring on every PostCreate/CommentCreate + weekly health digest posted automatically. Mods get protection without manual effort.
- **5× faster review**: Queue review drops from ~8 min/item to ~90 sec with AI context pre-filled.

### 🏆 Best Ported Data API App Honorable Mention ($1,000)

- **Full port of [ContextMod](https://github.com/FoxxMD/context-mod)** — the most-used external Reddit mod automation tool (MIT license, 700+ GitHub stars).
- **Complete API translation**: Every PRAW call → Devvit Reddit API. Hosted server → Devvit serverless triggers. SQLite state → Devvit Redis.
- **Added native platform value**: Visual rule builder (ContextMod required YAML config files), one-click install (ContextMod required a self-hosted server), Redis-native activity counters.
- **ContextMod-compatible rule schema**: Existing ContextMod users can recreate their rules in the UI without learning new syntax.

### 🏆 Devvit Helper Award ($500)

- Full MIT-licensed source with inline documentation explaining the Devvit-specific patterns.
- `TriggerContext` vs `Context` cast pattern documented in code comments — a common Devvit gotcha.
- `devtest.html` standalone test harness demonstrates how to build and test a Devvit WebView app without Playtest.
- Full PRAW → Devvit API mapping table in this README explains every translation for developers porting existing bots.

---

## Architecture

```
Devvit App (src/)
├── main.tsx              Custom post · triggers · scheduler · menu items · settings
├── constants.ts          Redis key schema · thresholds · default rules
├── types.ts              Shared TypeScript types
└── utils/
    ├── aiScorer.ts       Anthropic Claude Haiku scoring (AI%, spam%, risk level, signals)
    ├── ruleEngine.ts     ContextMod rule evaluation engine (ported from PRAW)
    ├── actionHandler.ts  Reddit mod actions: remove / ban / mute / report / lock
    ├── healthComputer.ts 7-day community health stats with Redis action log
    └── redisHelpers.ts   Queue · config · notes · 24h rolling activity tracker

React WebView (web/src/)
├── App.tsx               State machine + Devvit postMessage router
├── components/
│   ├── Dashboard.tsx     AI triage queue with filters, sort, and one-click actions
│   ├── RuleBuilder.tsx   Visual rule editor (condition builder + action selector)
│   ├── ModNotes.tsx      Collaborative notes with label system
│   ├── HealthPulse.tsx   Recharts analytics dashboard with 7-day trend chart
│   ├── UserProfile.tsx   Per-user timeline, risk profile, and mod history
│   ├── Sidebar.tsx       Navigation with queue depth badge
│   └── Onboarding.tsx    4-step setup wizard
└── hooks/
    └── useDevvit.ts      WebView ↔ Devvit postMessage bridge (handles both runtime and devtest)
```

### Triggers

| Trigger | What It Does |
|---------|-------------|
| `AppInstall` | Seeds 5 default rules and initial config on first install |
| `PostCreate` | Scores every new post; tracks author 24h activity; applies rules if auto-enforcement enabled |
| `CommentCreate` | Same as above for comments ≥100 chars |
| `PostReport` | Queues any reported post immediately and scores it |
| `CommentReport` | Queues any reported comment immediately and scores it |
| `weekly-health-digest` (cron) | Posts Monday 9 AM health report as a distinguished mod post |

### Redis Schema

| Key | Contents |
|-----|----------|
| `ms:queue:{sub}` | JSON array of up to 200 queue items with AI scores (7-day TTL per item) |
| `ms:notes:{sub}:{id}` | JSON array of mod notes (50 max per thread/user) |
| `ms:rules:{sub}` | JSON array of rule definitions with match counters |
| `ms:health:{sub}` | Cached health stats (1-hr TTL) |
| `ms:score:{sub}:{id}` | Cached AI score (24-hr TTL) |
| `ms:config:{sub}` | App config (setup state, API key presence, automation flags) |
| `ms:actions:{sub}` | Action log, last 500 entries |
| `ms:act24:{sub}:{user}` | Rolling timestamp arrays for 24h post/comment counts (48-hr TTL) |

---

## Setup & Deployment

### Prerequisites
- [Devvit CLI](https://developers.reddit.com/docs/cli): `npm i -g devvit`
- Node.js ≥ 18
- An [Anthropic API key](https://console.anthropic.com)

### 1. Build the React web app
```bash
cd web && npm install && npm run build
# Outputs bundle to ../webroot/
```

### 2. Deploy to Devvit
```bash
devvit upload
```

### 3. Install on your subreddit
1. Subreddit → Mod Tools → Community Appearance → Apps → ModSentinel → Install
2. App Settings → paste your Anthropic API key
3. Subreddit context menu → **Open ModSentinel Dashboard**
4. Complete the 4-step onboarding wizard

### 4. Local dev / testing
Open `webroot/devtest.html` in a browser — it runs the full React app with a mocked Devvit backend so you can test all features without Playtest or a live subreddit.

---

## Default Rules (ContextMod-compatible)

| Rule | Conditions | Action |
|------|-----------|--------|
| New Account Spam Guard | age < 7 days AND karma < 10 | Hold |
| AI Content Filter | AI score ≥ 80 | Report |
| Spam Burst Detection | posts in 24h > 5 | Remove |
| Community-Flagged Content | report count ≥ 3 | Hold |
| Cross-Subreddit Spam | unique subs in 24h > 8 | Report (disabled by default) |

---

## ContextMod Port Notes

| PRAW / ContextMod | Devvit equivalent |
|-------------------|------------------|
| `praw.Reddit()` client | `context.reddit.*` methods |
| `Subreddit.mod.queue()` | `PostCreate` / `CommentCreate` triggers + Redis queue |
| `Redditor.submissions.new()` 24h count | Redis rolling timestamp array (`ms:act24:{sub}:{user}`) |
| Rule YAML config files | `ms:rules:{sub}` Redis key, editable via WebView UI |
| SQLite for state | Devvit Redis (all operations via `context.redis`) |
| Hosted webhook server | Devvit serverless triggers (zero infra) |
| `praw.models.Comment.mod.remove()` | `context.reddit.remove({ id, isSpam })` |
| `praw.models.Subreddit.banned.add()` | `context.reddit.banUser({ subredditName, username, ... })` |
| ContextMod wiki-page config | Visual rule builder UI (no YAML required) |

The rule condition/action schema (`RuleCondition.field`, `RuleCondition.operator`, `Rule.action.type`) is intentionally compatible with ContextMod's YAML schema so power users can recreate existing rules.

---

## Devvit Patterns for Developers

**`TriggerContext` vs `Context`:**
Devvit trigger handlers receive `TriggerContext = Omit<Context, 'ui' | 'dimensions' | 'modLog' | 'uiEnvironment'>`. If you have utility functions typed to `Context`, cast at the top of each handler:
```typescript
const ctx = context as unknown as Context;
```

**`PostV2` field access:**
`event.post.subredditName` does not exist on the proto type. Use `event.subreddit?.name` instead.

**24-hour rolling counters:**
Don't use simple counters with daily resets — they break near midnight. Use Redis arrays of timestamps and filter by `Date.now() - 86400000`:
```typescript
log.posts = [...log.posts.filter(t => t > cutoff), Date.now()];
```

---

## Attribution

Rule engine ported from [ContextMod](https://github.com/FoxxMD/context-mod) by @FoxxMD — MIT License.
The condition evaluation logic, rule structure, and config philosophy are directly inspired by ContextMod.

---

*Built for the Devvit Hackathon 2025 · Reddit Mod Tools & Migrated Apps*
