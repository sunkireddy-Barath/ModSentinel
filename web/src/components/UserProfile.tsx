import { useState } from 'react';
import {
  ArrowLeft, User, Calendar, TrendingUp, Shield,
  Clock, FileText, MessageSquare, Cpu, Loader2,
} from 'lucide-react';
import type { UserProfile, RiskLevel, ModNote, NoteLabel, ActionType } from '../types';

interface UserProfileViewProps {
  user: UserProfile | null;
  loading: boolean;
  onBack: () => void;
  onAddNote: (thingId: string, thingType: 'post' | 'comment' | 'user', content: string, label: NoteLabel) => void;
  onLoadNotes: (thingId: string) => void;
  activeNotes: ModNote[];
  loadingNotes: boolean;
  addingNote: boolean;
  onTakeAction: (itemId: string, action: ActionType, reason?: string) => void;
  onOpenLink: (permalink: string) => void;
}

const RISK_BADGE: Record<RiskLevel, { label: string; class: string }> = {
  CRITICAL: { label: 'Critical Risk', class: 'text-risk-critical bg-risk-critical/10 border-risk-critical/30' },
  HIGH:     { label: 'High Risk',     class: 'text-risk-high bg-risk-high/10 border-risk-high/30' },
  MEDIUM:   { label: 'Medium Risk',   class: 'text-risk-medium bg-risk-medium/10 border-risk-medium/30' },
  LOW:      { label: 'Low Risk',      class: 'text-risk-low bg-risk-low/10 border-risk-low/30' },
  SAFE:     { label: 'Safe',          class: 'text-risk-safe bg-risk-safe/10 border-risk-safe/30' },
};

export function UserProfileView({
  user, loading, onBack, onAddNote, onLoadNotes, activeNotes, loadingNotes, addingNote,
  onTakeAction, onOpenLink,
}: UserProfileViewProps) {
  const [activeTab, setActiveTab] = useState<'activity' | 'notes' | 'history'>('activity');

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-text-muted hover:text-text-secondary text-sm mb-3 transition-colors"
        >
          <ArrowLeft size={14} />
          Back to queue
        </button>

        {loading ? (
          <div className="flex items-center gap-3">
            <Loader2 size={20} className="animate-spin text-reddit-orange" />
            <span className="text-text-muted text-sm">Loading user profile…</span>
          </div>
        ) : user ? (
          <UserHeader user={user} />
        ) : (
          <p className="text-text-muted text-sm">User not found</p>
        )}
      </div>

      {user && (
        <>
          {/* Tabs */}
          <div className="flex border-b border-border flex-shrink-0">
            {(['activity', 'notes', 'history'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  if (tab === 'notes') onLoadNotes(user.username);
                }}
                className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-reddit-orange text-reddit-orange'
                    : 'border-transparent text-text-muted hover:text-text-secondary'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'notes' && user.notes.length > 0 && (
                  <span className="ml-1.5 text-xs bg-bg-tertiary text-text-secondary px-1.5 py-0.5 rounded-full">
                    {user.notes.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'activity' && (
              <ActivityTab user={user} onOpenLink={onOpenLink} onTakeAction={onTakeAction} />
            )}
            {activeTab === 'notes' && (
              <div className="p-5">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-text-primary font-semibold text-sm">Mod Notes for u/{user.username}</h3>
                </div>
                {loadingNotes ? (
                  <div className="flex justify-center py-8">
                    <Loader2 size={20} className="animate-spin text-reddit-orange" />
                  </div>
                ) : (
                  <InlineNoteEditor
                    username={user.username}
                    notes={activeNotes}
                    onAdd={(content, label) => onAddNote(user.username, 'user', content, label)}
                    adding={addingNote}
                  />
                )}
              </div>
            )}
            {activeTab === 'history' && (
              <HistoryTab user={user} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

function UserHeader({ user }: { user: UserProfile }) {
  const riskBadge = RISK_BADGE[user.riskProfile.overallRisk];

  return (
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-reddit-orange/20 flex items-center justify-center flex-shrink-0">
        <User size={24} className="text-reddit-orange" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-text-primary font-bold text-lg">u/{user.username}</h2>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${riskBadge.class}`}>
            {riskBadge.label}
          </span>
        </div>
        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
          <span className="flex items-center gap-1 text-text-muted text-xs">
            <TrendingUp size={11} />
            {user.karma.toLocaleString()} karma
          </span>
          <span className="flex items-center gap-1 text-text-muted text-xs">
            <Calendar size={11} />
            {user.accountAgeDays}d old account
          </span>
          <span className="flex items-center gap-1 text-text-muted text-xs">
            <FileText size={11} />
            {user.recentActivity.length} recent actions
          </span>
        </div>
        {/* Risk signals */}
        {[...user.riskProfile.spamSignals, ...user.riskProfile.aiGenSignals, ...user.riskProfile.behaviorPatterns].length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {user.riskProfile.spamSignals.map(s => (
              <span key={s} className="text-xs bg-risk-high/10 text-risk-high px-2 py-0.5 rounded-full border border-risk-high/20">
                ⚠ {s}
              </span>
            ))}
            {user.riskProfile.aiGenSignals.map(s => (
              <span key={s} className="text-xs bg-purple-400/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                <Cpu size={10} className="inline mr-1" />{s}
              </span>
            ))}
            {user.riskProfile.behaviorPatterns.map(s => (
              <span key={s} className="text-xs bg-amber-400/10 text-amber-400 px-2 py-0.5 rounded-full border border-amber-400/20">
                {s}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityTab({
  user, onOpenLink, onTakeAction,
}: { user: UserProfile; onOpenLink: (p: string) => void; onTakeAction: (id: string, a: ActionType, reason?: string) => void }) {
  if (user.recentActivity.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText size={28} className="text-text-muted opacity-40 mb-3" />
        <p className="text-text-muted text-sm">No recent activity in this subreddit</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {user.recentActivity.map(item => (
        <div key={item.id} className="px-5 py-3 hover:bg-bg-hover/20 transition-colors">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              {item.type === 'post'
                ? <FileText size={13} className="text-text-muted" />
                : <MessageSquare size={13} className="text-text-muted" />
              }
              <span className="text-text-muted text-xs capitalize">{item.type}</span>
            </div>
            <div className="flex-1 min-w-0">
              {item.title && (
                <div className="text-text-primary text-sm font-medium truncate">{item.title}</div>
              )}
              <div className="text-text-secondary text-xs line-clamp-2 mt-0.5">{item.body}</div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="flex items-center gap-1.5">
                {item.aiScore !== undefined && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                    item.aiScore >= 80 ? 'bg-risk-critical/10 text-risk-critical' :
                    item.aiScore >= 60 ? 'bg-risk-high/10 text-risk-high' :
                    'bg-bg-tertiary text-text-muted'
                  }`}>
                    {item.aiScore}
                  </span>
                )}
                <span className={`text-xs px-1.5 py-0.5 rounded ${
                  item.status === 'removed' ? 'text-risk-critical' :
                  item.status === 'approved' ? 'text-risk-low' :
                  'text-text-muted'
                }`}>
                  {item.status}
                </span>
              </div>
              <div className="text-text-muted text-xs mt-1 flex items-center gap-1 justify-end">
                <Clock size={10} />
                {relativeTime(item.createdAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function HistoryTab({ user }: { user: UserProfile }) {
  if (user.modHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield size={28} className="text-text-muted opacity-40 mb-3" />
        <p className="text-text-muted text-sm">No mod actions recorded for this user</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border/40">
      {user.modHistory.map((entry, i) => (
        <div key={i} className="px-5 py-3">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-text-primary text-sm font-medium capitalize">{entry.action}</span>
              <span className="text-text-muted text-xs ml-2">by u/{entry.mod}</span>
            </div>
            <span className="text-text-muted text-xs flex items-center gap-1">
              <Clock size={10} />
              {relativeTime(entry.timestamp)}
            </span>
          </div>
          {entry.reason && (
            <p className="text-text-secondary text-xs mt-1">{entry.reason}</p>
          )}
        </div>
      ))}
    </div>
  );
}

function InlineNoteEditor({
  username, notes, onAdd, adding,
}: { username: string; notes: ModNote[]; onAdd: (content: string, label: NoteLabel) => void; adding: boolean }) {
  const [content, setContent] = useState('');
  const [label, setLabel] = useState<NoteLabel>('info');

  const LABEL_COLORS: Record<NoteLabel, string> = {
    spam:    'bg-risk-critical/10 text-risk-critical border-risk-critical/30',
    abuse:   'bg-risk-high/10 text-risk-high border-risk-high/30',
    warning: 'bg-risk-medium/10 text-risk-medium border-risk-medium/30',
    helpful: 'bg-risk-low/10 text-risk-low border-risk-low/30',
    watch:   'bg-risk-safe/10 text-risk-safe border-risk-safe/30',
    info:    'bg-purple-400/10 text-purple-400 border-purple-400/30',
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    onAdd(content.trim(), label);
    setContent('');
  };

  return (
    <div className="space-y-4">
      {/* Add note form */}
      <form onSubmit={handleSubmit} className="bg-bg-secondary rounded-xl p-4 border border-border">
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(Object.keys(LABEL_COLORS) as NoteLabel[]).map(l => (
            <button
              key={l}
              type="button"
              onClick={() => setLabel(l)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                label === l ? LABEL_COLORS[l] + ' font-semibold' : 'border-border text-text-muted hover:border-border/80'
              }`}
            >
              {l.charAt(0).toUpperCase() + l.slice(1)}
            </button>
          ))}
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder={`Add a note about u/${username}…`}
          rows={2}
          className="w-full bg-bg-tertiary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange resize-none placeholder:text-text-muted"
        />
        <button
          type="submit"
          disabled={!content.trim() || adding}
          className="mt-2 w-full py-2 bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          {adding ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Note'}
        </button>
      </form>

      {/* Existing notes */}
      {notes.length > 0 && (
        <div className="space-y-2">
          {notes.map(note => (
            <div key={note.id} className="bg-bg-card border border-border rounded-xl px-4 py-3">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${LABEL_COLORS[note.label]}`}>
                    {note.label}
                  </span>
                  <span className="text-text-secondary text-xs">u/{note.authorMod}</span>
                </div>
                <span className="text-text-muted text-xs">{relativeTime(note.createdAt)}</span>
              </div>
              <p className="text-text-secondary text-sm">{note.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}
