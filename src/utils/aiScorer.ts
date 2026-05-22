import type { Context } from '@devvit/public-api';
import type { AIScore, RiskLevel } from '../types.js';
import { ANTHROPIC_MODEL, ANTHROPIC_SCORING_TOKENS, RISK_THRESHOLDS } from '../constants.js';

interface ScoringInput {
  content: string;
  title?: string;
  apiKey: string;
  authorAge?: number;
  authorKarma?: number;
}

const SCORING_PROMPT = `You are a Reddit moderation AI. Analyze the following post/comment and return a JSON object.

Evaluate:
1. AI-generated probability (0-100): Does this sound like ChatGPT/LLM output? (overly formal, no personal opinion, generic, padding, disclaimer language)
2. Spam score (0-100): Is this self-promotion, link farming, repetitive content, or low-effort?
3. Overall risk score (0-100): Combined risk considering both the above plus any rule violations

Return ONLY valid JSON, no prose:
{
  "score": <0-100>,
  "aiGenerated": <0-100>,
  "spamScore": <0-100>,
  "signals": ["signal1", "signal2"],
  "reasoning": "<one sentence>"
}`;

function getRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.CRITICAL) return 'CRITICAL';
  if (score >= RISK_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= RISK_THRESHOLDS.MEDIUM) return 'MEDIUM';
  if (score >= RISK_THRESHOLDS.LOW) return 'LOW';
  return 'SAFE';
}

export async function scoreContent(
  context: Context,
  input: ScoringInput,
): Promise<AIScore> {
  const textToScore = input.title
    ? `Title: ${input.title}\n\nBody: ${input.content}`
    : input.content;

  const truncated = textToScore.slice(0, 2000);

  let parsed: { score: number; aiGenerated: number; spamScore: number; signals: string[]; reasoning: string };

  try {
    const resp = await context.fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': input.apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: ANTHROPIC_SCORING_TOKENS,
        system: SCORING_PROMPT,
        messages: [{ role: 'user', content: truncated }],
      }),
    });

    if (!resp.ok) {
      throw new Error(`Anthropic API error: ${resp.status}`);
    }

    const data = await resp.json() as { content: Array<{ text: string }> };
    const raw = data.content[0]?.text ?? '{}';

    // Strip markdown code fences if present
    const jsonStr = raw.replace(/```json?\s*/g, '').replace(/```/g, '').trim();
    parsed = JSON.parse(jsonStr) as typeof parsed;
  } catch {
    // Heuristic fallback when API is unavailable
    parsed = heuristicScore(input.content, input.title, input.authorAge, input.authorKarma);
  }

  // Clamp all values 0–100
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

  return {
    score: clamp(parsed.score),
    riskLevel: getRiskLevel(clamp(parsed.score)),
    aiGenerated: clamp(parsed.aiGenerated),
    spamScore: clamp(parsed.spamScore),
    signals: Array.isArray(parsed.signals) ? parsed.signals.slice(0, 6) : [],
    reasoning: String(parsed.reasoning ?? '').slice(0, 200),
    scoredAt: Date.now(),
  };
}

function heuristicScore(
  content: string,
  title?: string,
  accountAgeDays?: number,
  karma?: number,
): { score: number; aiGenerated: number; spamScore: number; signals: string[]; reasoning: string } {
  let score = 0;
  let aiGenerated = 0;
  let spamScore = 0;
  const signals: string[] = [];

  const text = `${title ?? ''} ${content}`.toLowerCase();
  const wordCount = text.split(/\s+/).length;

  // Account age signals
  if (accountAgeDays !== undefined && accountAgeDays < 30) {
    score += 20;
    spamScore += 15;
    signals.push('New account (<30 days)');
  }
  if (karma !== undefined && karma < 10) {
    score += 10;
    spamScore += 10;
    signals.push('Very low karma');
  }

  // AI generation signals
  const aiPhrases = [
    'as an ai', "i'm an ai", 'as a language model', 'i cannot provide',
    'i understand that', 'it is important to note', 'in conclusion',
    'furthermore', 'in summary', 'it is worth noting', 'delve into',
    'certainly!', 'absolutely!', 'great question',
  ];
  const aiMatches = aiPhrases.filter(p => text.includes(p)).length;
  if (aiMatches >= 3) {
    aiGenerated += 70;
    score += 30;
    signals.push('Multiple AI-typical phrases detected');
  } else if (aiMatches >= 1) {
    aiGenerated += 30;
    score += 10;
    signals.push('Some AI-typical language');
  }

  // Spam signals
  const urlCount = (content.match(/https?:\/\//g) ?? []).length;
  if (urlCount > 3) {
    spamScore += 40;
    score += 25;
    signals.push('Multiple URLs');
  }
  if (wordCount < 5) {
    spamScore += 20;
    score += 10;
    signals.push('Very short content');
  }

  return {
    score: Math.min(score, 100),
    aiGenerated: Math.min(aiGenerated, 100),
    spamScore: Math.min(spamScore, 100),
    signals,
    reasoning: 'Heuristic scoring (API unavailable)',
  };
}
