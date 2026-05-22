import { useState } from 'react';
import { Shield, Zap, BookOpen, CheckCircle, ChevronRight, AlertCircle } from 'lucide-react';

interface OnboardingProps {
  onComplete: () => void;
  hasApiKey: boolean;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to ModSentinel',
    subtitle: 'AI-powered moderation command center',
    icon: Shield,
  },
  {
    id: 'features',
    title: 'What ModSentinel does',
    subtitle: 'Here\'s everything you\'re getting',
    icon: Zap,
  },
  {
    id: 'rules',
    title: 'Default rules are ready',
    subtitle: 'Pre-built to catch the most common issues',
    icon: BookOpen,
  },
  {
    id: 'done',
    title: 'You\'re all set!',
    subtitle: 'Your mod command center is live',
    icon: CheckCircle,
  },
];

export function Onboarding({ onComplete, hasApiKey }: OnboardingProps) {
  const [step, setStep] = useState(0);

  return (
    <div className="h-full flex items-center justify-center bg-bg-primary p-6">
      <div className="w-full max-w-lg">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {steps.map((s, i) => (
            <div
              key={s.id}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= step ? 'bg-reddit-orange w-8' : 'bg-border w-4'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-bg-card border border-border rounded-2xl p-8 animate-slide-in">
          {step === 0 && <StepWelcome />}
          {step === 1 && <StepFeatures />}
          {step === 2 && <StepRules hasApiKey={hasApiKey} />}
          {step === 3 && <StepDone />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 0 ? (
              <button
                onClick={() => setStep(s => s - 1)}
                className="text-text-secondary hover:text-text-primary text-sm transition-colors"
              >
                ← Back
              </button>
            ) : <div />}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 bg-reddit-orange hover:bg-reddit-orangeHover text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={onComplete}
                className="flex items-center gap-2 bg-reddit-orange hover:bg-reddit-orangeHover text-white font-bold px-8 py-3 rounded-xl transition-colors"
              >
                Open Dashboard <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StepWelcome() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-reddit-orange/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <Shield size={40} className="text-reddit-orange" />
      </div>
      <h1 className="text-2xl font-bold text-text-primary mb-3">Welcome to ModSentinel</h1>
      <p className="text-text-secondary leading-relaxed mb-6">
        The AI-powered moderation command center that gives your team real-time triage,
        intelligent content scoring, visual rule building, and community health analytics —
        all without leaving Reddit.
      </p>
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { label: 'Avg time saved', value: '6 min/item' },
          { label: 'AI accuracy', value: '91%' },
          { label: 'Setup time', value: '< 2 min' },
        ].map(stat => (
          <div key={stat.label} className="bg-bg-secondary rounded-xl p-3">
            <div className="text-reddit-orange font-bold text-lg">{stat.value}</div>
            <div className="text-text-muted text-xs mt-0.5">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepFeatures() {
  const features = [
    {
      icon: '🎯',
      title: 'AI Triage Queue',
      desc: 'Every post & comment scored for AI content, spam, and risk in real time',
    },
    {
      icon: '⚙️',
      title: 'Visual Rule Builder',
      desc: 'Build ContextMod-style rules with a no-code drag-and-drop interface',
    },
    {
      icon: '📝',
      title: 'Collaborative Mod Notes',
      desc: 'Shared real-time notes on users and posts — your whole team sees them instantly',
    },
    {
      icon: '📊',
      title: 'Community Health Pulse',
      desc: 'Weekly analytics showing trends, top offenders, and AI content rates',
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-5">What you\'re getting</h2>
      <div className="space-y-3">
        {features.map(f => (
          <div key={f.title} className="flex gap-3 p-3 bg-bg-secondary rounded-xl">
            <span className="text-2xl flex-shrink-0">{f.icon}</span>
            <div>
              <div className="text-text-primary font-semibold text-sm">{f.title}</div>
              <div className="text-text-muted text-xs mt-0.5">{f.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepRules({ hasApiKey }: { hasApiKey: boolean }) {
  const rules = [
    'New Account Spam Guard — holds posts from accounts <7 days',
    'AI-Generated Content Filter — reports likely AI posts',
    'Spam Burst Detection — removes 5+ posts in 24 hours',
    'Community-Flagged Content — holds items with 3+ reports',
    'Cross-Subreddit Spam — flags cross-posting patterns',
  ];

  return (
    <div>
      <h2 className="text-xl font-bold text-text-primary mb-2">Default rules loaded</h2>
      <p className="text-text-secondary text-sm mb-5">
        You can customize these in the Rule Builder tab after setup.
      </p>

      {!hasApiKey && (
        <div className="flex gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-4">
          <AlertCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <div className="text-amber-400 font-semibold text-sm">AI scoring not active</div>
            <div className="text-text-secondary text-xs mt-0.5">
              Add your Anthropic API key in Settings to enable AI scoring. Rules still work without it.
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {rules.map(r => (
          <div key={r} className="flex items-start gap-2 text-sm">
            <CheckCircle size={14} className="text-risk-low flex-shrink-0 mt-0.5" />
            <span className="text-text-secondary">{r}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepDone() {
  return (
    <div className="text-center">
      <div className="w-20 h-20 bg-risk-low/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <CheckCircle size={40} className="text-risk-low" />
      </div>
      <h2 className="text-2xl font-bold text-text-primary mb-3">You\'re ready to go!</h2>
      <p className="text-text-secondary leading-relaxed mb-6">
        ModSentinel is now active on your subreddit. New posts and comments will be
        automatically scored and queued for review.
      </p>
      <div className="text-left space-y-2 bg-bg-secondary rounded-xl p-4">
        <div className="text-text-secondary text-sm font-medium mb-3">Quick tips:</div>
        {[
          'Use the Triage Queue to review flagged content with one click',
          'Click any username to see their full activity timeline',
          'Weekly health reports are posted automatically every Monday',
          'Right-click any post in Reddit to score it instantly',
        ].map(tip => (
          <div key={tip} className="flex gap-2 text-xs text-text-muted">
            <span className="text-reddit-orange">→</span>
            <span>{tip}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
