import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import {
  RefreshCw, CheckCircle, XCircle, Flag, Lock,
  Clock, User, Cpu, MoreHorizontal,
  ChevronDown, ChevronUp, ExternalLink, Loader2,
  Zap, Square, CheckSquare, Keyboard,
} from 'lucide-react';
import type { QueueItem, ActionType, RiskLevel } from '../types';

interface DashboardProps {
  items: QueueItem[];
  loading: boolean;
  onRefresh: () => void;
  onAction: (itemId: string, action: ActionType, reason?: string, banDuration?: number) => void;
  onBulkAction: (ids: string[], action: ActionType) => void;
  onScore: (item: QueueItem) => void;
  onScoreAll: () => void;
  onViewUser: (username: string) => void;
  onOpenLink: (permalink: string) => void;
  scoringIds: Set<string>;
  actingIds: Set<string>;
}

type FilterRisk = 'all' | RiskLevel;
type FilterStatus = 'all' | 'pending' | 'approved' | 'removed';
type FilterType = 'all' | 'post' | 'comment';

const RISK_COLORS: Record<RiskLevel, string> = {
  CRITICAL: 'text-risk-critical bg-risk-critical/10 border-risk-critical/30',
  HIGH:     'text-risk-high bg-risk-high/10 border-risk-high/30',
  MEDIUM:   'text-risk-medium bg-risk-medium/10 border-risk-medium/30',
  LOW:      'text-risk-low bg-risk-low/10 border-risk-low/30',
  SAFE:     'text-risk-safe bg-risk-safe/10 border-risk-safe/30',
};

const RISK_DOT: Record<RiskLevel, string> = {
  CRITICAL: 'bg-risk-critical',
  HIGH:     'bg-risk-high',
  MEDIUM:   'bg-risk-medium',
  LOW:      'bg-risk-low',
  SAFE:     'bg-risk-safe',
};

const RISK_ORDER: Record<string, number> = {
  CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3, SAFE: 4,
};

export function Dashboard({
  items, loading, onRefresh, onAction, onBulkAction, onScore, onScoreAll,
  onViewUser, onOpenLink, scoringIds, actingIds,
}: DashboardProps) {
  const [filterRisk, setFilterRisk] = useState<FilterRisk>('all');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('pending');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionModal, setActionModal] = useState<{ itemId: string; author: string } | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const filtered = items
    .filter(item => {
      if (filterStatus !== 'all' && item.status !== filterStatus) return false;
      if (filterType !== 'all' && item.type !== filterType) return false;
      if (filterRisk !== 'all') {
        const level = item.aiScore?.riskLevel ?? 'SAFE';
        if (level !== filterRisk) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const aRisk = RISK_ORDER[a.aiScore?.riskLevel ?? ''] ?? 5;
      const bRisk = RISK_ORDER[b.aiScore?.riskLevel ?? ''] ?? 5;
      if (aRisk !== bRisk) return aRisk - bRisk;
      return b.createdAt - a.createdAt;
    });

  const pendingItems = filtered.filter(i => i.status === 'pending');
  const criticalCount = items.filter(i => i.aiScore?.riskLevel === 'CRITICAL' && i.status === 'pending').length;
  const pendingCount = items.filter(i => i.status === 'pending').length;
  const unscoredCount = items.filter(i => i.status === 'pending' && !i.aiScore).length;

  const allPendingFilteredIds = pendingItems.map(i => i.id);
  const allPendingSelected = allPendingFilteredIds.length > 0 &&
    allPendingFilteredIds.every(id => selectedIds.has(id));

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  }

  function toggleSelectAll() {
    if (allPendingSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allPendingFilteredIds));
    }
  }

  function handleBulk(action: ActionType) {
    const ids = [...selectedIds];
    onBulkAction(ids, action);
    setSelectedIds(new Set());
  }

  // Keyboard shortcuts — only when not typing in an input
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (actionModal) return;

      const pendingFiltered = filtered.filter(i => i.status === 'pending');
      const curIdx = expandedId ? pendingFiltered.findIndex(i => i.id === expandedId) : -1;

      switch (e.key) {
        case 'j':
        case 'ArrowDown': {
          if (!pendingFiltered.length) return;
          e.preventDefault();
          const next = curIdx < pendingFiltered.length - 1 ? curIdx + 1 : 0;
          setExpandedId(pendingFiltered[next].id);
          break;
        }
        case 'k':
        case 'ArrowUp': {
          if (!pendingFiltered.length) return;
          e.preventDefault();
          const prev = curIdx > 0 ? curIdx - 1 : pendingFiltered.length - 1;
          setExpandedId(pendingFiltered[prev].id);
          break;
        }
        case 'a': {
          if (!expandedId) return;
          const item = filtered.find(i => i.id === expandedId);
          if (item?.status === 'pending') onAction(expandedId, 'approve');
          break;
        }
        case 'r': {
          if (!expandedId) return;
          const item = filtered.find(i => i.id === expandedId);
          if (item?.status === 'pending') onAction(expandedId, 'remove');
          break;
        }
        case 'h': {
          if (!expandedId) return;
          const item = filtered.find(i => i.id === expandedId);
          if (item?.status === 'pending') onAction(expandedId, 'hold');
          break;
        }
        case 's': {
          if (!expandedId) return;
          const item = filtered.find(i => i.id === expandedId);
          if (item && !item.aiScore) onScore(item);
          break;
        }
        case 'x': {
          if (!expandedId) return;
          const item = filtered.find(i => i.id === expandedId);
          if (item?.status === 'pending') {
            setSelectedIds(prev => {
              const s = new Set(prev);
              s.has(expandedId) ? s.delete(expandedId) : s.add(expandedId);
              return s;
            });
          }
          break;
        }
        case 'Escape':
          if (shortcutsOpen) { setShortcutsOpen(false); return; }
          setExpandedId(null);
          break;
        case '?':
          setShortcutsOpen(v => !v);
          break;
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [actionModal, filtered, expandedId, shortcutsOpen, onAction, onScore]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Triage Queue</h2>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-text-muted text-xs">{pendingCount} pending review</span>
            {criticalCount > 0 && (
              <span className="text-xs font-semibold text-risk-critical bg-risk-critical/10 px-2 py-0.5 rounded-full border border-risk-critical/30">
                {criticalCount} critical
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unscoredCount > 0 && (
            <button
              onClick={onScoreAll}
              className="flex items-center gap-1.5 text-xs bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 border border-purple-500/30 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Zap size={12} />
              Score All ({unscoredCount})
            </button>
          )}
          <button
            onClick={() => setShortcutsOpen(true)}
            title="Keyboard shortcuts (?)"
            className="flex items-center gap-1 text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            <Keyboard size={13} />
          </button>
          <button
            onClick={onRefresh}
            disabled={loading}
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="px-5 py-3 border-b border-border flex flex-wrap gap-2 flex-shrink-0 bg-bg-secondary/50">
        <FilterGroup
          label="Status"
          options={['all', 'pending', 'approved', 'removed'] as FilterStatus[]}
          value={filterStatus}
          onChange={v => { setFilterStatus(v); setSelectedIds(new Set()); }}
        />
        <div className="w-px bg-border mx-1" />
        <FilterGroup
          label="Type"
          options={['all', 'post', 'comment'] as FilterType[]}
          value={filterType}
          onChange={setFilterType}
        />
        <div className="w-px bg-border mx-1" />
        <FilterGroup
          label="Risk"
          options={['all', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'SAFE'] as FilterRisk[]}
          value={filterRisk}
          onChange={setFilterRisk}
        />
        {filtered.length > 0 && filterStatus !== 'all' && (
          <>
            <div className="w-px bg-border mx-1" />
            <span className="text-text-muted text-xs self-center">{filtered.length} shown</span>
          </>
        )}
      </div>

      {/* Select-all bar (only when pending items exist) */}
      {pendingItems.length > 0 && (
        <div className="px-5 py-2 border-b border-border/50 flex items-center gap-3 bg-bg-secondary/30 flex-shrink-0">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-text-muted hover:text-text-secondary text-xs transition-colors"
          >
            {allPendingSelected
              ? <CheckSquare size={13} className="text-reddit-orange" />
              : <Square size={13} />
            }
            {allPendingSelected ? 'Deselect all' : `Select all ${pendingItems.length}`}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-xs text-reddit-orange font-medium">
              {selectedIds.size} selected
            </span>
          )}
        </div>
      )}

      {/* Queue */}
      <div className="flex-1 overflow-y-auto">
        {loading && items.length === 0 ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState filterStatus={filterStatus} />
        ) : (
          <div className="divide-y divide-border/50">
            {filtered.map(item => (
              <QueueCard
                key={item.id}
                item={item}
                expanded={expandedId === item.id}
                onToggleExpand={() => setExpandedId(id => id === item.id ? null : item.id)}
                onAction={onAction}
                onScore={() => onScore(item)}
                onViewUser={() => onViewUser(item.author)}
                onOpenLink={() => onOpenLink(item.permalink)}
                isScoring={scoringIds.has(item.id)}
                isActing={actingIds.has(item.id)}
                onShowActionModal={() => setActionModal({ itemId: item.id, author: item.author })}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex-shrink-0 px-5 py-3 border-t border-border bg-bg-card flex items-center justify-between animate-slide-in">
          <span className="text-text-secondary text-sm font-medium">
            {selectedIds.size} item{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleBulk('approve')}
              className="flex items-center gap-1.5 text-xs bg-risk-low/10 text-risk-low hover:bg-risk-low/20 border border-risk-low/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <CheckCircle size={12} />
              Approve All
            </button>
            <button
              onClick={() => handleBulk('remove')}
              className="flex items-center gap-1.5 text-xs bg-risk-critical/10 text-risk-critical hover:bg-risk-critical/20 border border-risk-critical/30 px-3 py-1.5 rounded-lg transition-colors font-medium"
            >
              <XCircle size={12} />
              Remove All
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-text-muted hover:text-text-secondary px-2 py-1.5 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {shortcutsOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShortcutsOpen(false)}
        >
          <div
            className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-xs animate-slide-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-text-primary font-bold">Keyboard Shortcuts</h3>
              <Keyboard size={16} className="text-text-muted" />
            </div>
            <div className="space-y-2">
              {[
                ['j / ↓', 'Next pending item'],
                ['k / ↑', 'Previous pending item'],
                ['a', 'Approve focused item'],
                ['r', 'Remove focused item'],
                ['h', 'Hold focused item'],
                ['s', 'AI-score focused item'],
                ['x', 'Toggle select focused item'],
                ['Esc', 'Collapse / close'],
                ['?', 'Toggle this help'],
              ].map(([key, desc]) => (
                <div key={key} className="flex items-center justify-between">
                  <kbd className="bg-bg-tertiary border border-border text-text-secondary text-xs px-2 py-0.5 rounded font-mono">
                    {key}
                  </kbd>
                  <span className="text-text-muted text-xs">{desc}</span>
                </div>
              ))}
            </div>
            <button
              onClick={() => setShortcutsOpen(false)}
              className="mt-5 w-full py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Ban/Action modal */}
      {actionModal && (
        <ActionModal
          author={actionModal.author}
          onConfirm={(action, reason, banDuration) => {
            onAction(actionModal.itemId, action, reason, banDuration);
            setActionModal(null);
          }}
          onClose={() => setActionModal(null)}
        />
      )}
    </div>
  );
}

// ─── QueueCard ────────────────────────────────────────────────────────────────

interface QueueCardProps {
  item: QueueItem;
  expanded: boolean;
  onToggleExpand: () => void;
  onAction: (itemId: string, action: ActionType, reason?: string, banDuration?: number) => void;
  onScore: () => void;
  onViewUser: () => void;
  onOpenLink: () => void;
  isScoring: boolean;
  isActing: boolean;
  onShowActionModal: () => void;
  selected: boolean;
  onToggleSelect: () => void;
}

function QueueCard({
  item, expanded, onToggleExpand, onAction, onScore, onViewUser, onOpenLink,
  isScoring, isActing, onShowActionModal, selected, onToggleSelect,
}: QueueCardProps) {
  const score = item.aiScore;
  const riskLevel = score?.riskLevel ?? null;
  const isActioned = item.status !== 'pending';

  return (
    <div
      className={`
        group transition-colors
        ${selected ? 'bg-reddit-orange/5 border-l-2 border-reddit-orange' :
          isActioned ? 'opacity-60' :
          riskLevel === 'CRITICAL' ? 'border-l-2 border-risk-critical hover:bg-bg-hover/30' :
          'hover:bg-bg-hover/30'
        }
      `}
    >
      {/* Main row */}
      <div className="px-5 py-3.5">
        <div className="flex items-start gap-3">
          {/* Checkbox / risk indicator */}
          <div className="flex-shrink-0 mt-1 w-4 flex items-center justify-center">
            {!isActioned ? (
              <button
                onClick={onToggleSelect}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ opacity: selected ? 1 : undefined }}
              >
                {selected
                  ? <CheckSquare size={14} className="text-reddit-orange" />
                  : <Square size={14} className="text-text-muted" />
                }
              </button>
            ) : riskLevel ? (
              <div className={`w-2 h-2 rounded-full ${RISK_DOT[riskLevel]}`} />
            ) : (
              <div className="w-2 h-2 rounded-full bg-border" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Title row */}
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                {item.type === 'post' && item.title && (
                  <div className="text-text-primary font-medium text-sm leading-snug truncate">
                    {item.title}
                  </div>
                )}
                <div className={`text-text-secondary text-xs leading-relaxed mt-0.5 ${!expanded ? 'line-clamp-2' : ''}`}>
                  {item.body || <span className="italic text-text-muted">[no body]</span>}
                </div>
              </div>

              {/* Score badge */}
              {score && (
                <div className={`flex-shrink-0 text-xs font-bold px-2 py-1 rounded-lg border ${RISK_COLORS[score.riskLevel]}`}>
                  {score.score}
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <button
                onClick={onViewUser}
                className="flex items-center gap-1 text-text-muted text-xs hover:text-reddit-orange transition-colors"
              >
                <User size={10} />
                u/{item.author}
              </button>
              <span className="flex items-center gap-1 text-text-muted text-xs">
                <Clock size={10} />
                {relativeTime(item.createdAt)}
              </span>
              <span className="text-text-muted text-xs capitalize">{item.type}</span>
              {item.reportCount > 0 && (
                <span className="flex items-center gap-1 text-risk-medium text-xs">
                  <Flag size={10} />
                  {item.reportCount} report{item.reportCount !== 1 ? 's' : ''}
                </span>
              )}
              {item.authorAge < 30 && (
                <span className="text-xs text-amber-400">New account</span>
              )}
              {score && score.aiGenerated >= 70 && (
                <span className="flex items-center gap-1 text-xs text-purple-400">
                  <Cpu size={10} />
                  AI {score.aiGenerated}%
                </span>
              )}
              {isActioned && (
                <span className={`text-xs font-medium capitalize ${
                  item.status === 'approved' ? 'text-risk-low' : 'text-risk-critical'
                }`}>
                  {item.status}
                </span>
              )}
            </div>

            {/* Expanded: signals + account info */}
            {expanded && score && (
              <div className="mt-3 space-y-2 animate-fade-in">
                {score.signals.length > 0 && (
                  <div>
                    <div className="text-text-muted text-xs font-medium mb-1">Risk signals</div>
                    <div className="flex flex-wrap gap-1.5">
                      {score.signals.map(s => (
                        <span key={s} className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {score.reasoning && (
                  <div className="text-xs text-text-muted italic bg-bg-secondary rounded-lg px-3 py-2">
                    "{score.reasoning}"
                  </div>
                )}
                <div className="flex gap-4 text-xs text-text-muted">
                  <span>Account age: <strong className="text-text-secondary">{item.authorAge}d</strong></span>
                  <span>Karma: <strong className="text-text-secondary">{item.authorKarma.toLocaleString()}</strong></span>
                  <span>AI: <strong className="text-text-secondary">{score.aiGenerated}%</strong></span>
                  <span>Spam: <strong className="text-text-secondary">{score.spamScore}%</strong></span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-3 ml-7">
          <div className="flex items-center gap-1.5">
            {!isActioned && (
              <>
                <ActionButton
                  onClick={() => onAction(item.id, 'approve')}
                  disabled={isActing}
                  variant="approve"
                  icon={<CheckCircle size={13} />}
                  label="Approve"
                />
                <ActionButton
                  onClick={() => onAction(item.id, 'remove', 'Rule violation')}
                  disabled={isActing}
                  variant="remove"
                  icon={<XCircle size={13} />}
                  label="Remove"
                />
                <ActionButton
                  onClick={() => onAction(item.id, 'hold')}
                  disabled={isActing}
                  variant="hold"
                  icon={<Lock size={13} />}
                  label="Hold"
                />
                <ActionButton
                  onClick={() => onAction(item.id, 'report', 'Suspicious content')}
                  disabled={isActing}
                  variant="report"
                  icon={<Flag size={13} />}
                  label="Report"
                />
                <ActionButton
                  onClick={onShowActionModal}
                  disabled={isActing}
                  variant="more"
                  icon={<MoreHorizontal size={13} />}
                  label="More"
                />
              </>
            )}
            {isActing && (
              <Loader2 size={14} className="animate-spin text-text-muted ml-1" />
            )}
          </div>

          <div className="flex items-center gap-2">
            {!score && !isScoring && (
              <button
                onClick={onScore}
                className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                <Cpu size={11} />
                Score
              </button>
            )}
            {isScoring && (
              <span className="flex items-center gap-1 text-xs text-purple-400">
                <Loader2 size={11} className="animate-spin" />
                Scoring…
              </span>
            )}
            <button
              onClick={onOpenLink}
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              <ExternalLink size={12} />
            </button>
            <button
              onClick={onToggleExpand}
              className="text-text-muted hover:text-text-secondary transition-colors"
            >
              {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ActionButton({
  onClick, disabled, variant, icon, label,
}: {
  onClick: () => void;
  disabled: boolean;
  variant: 'approve' | 'remove' | 'hold' | 'report' | 'more';
  icon: ReactNode;
  label: string;
}) {
  const styles: Record<string, string> = {
    approve: 'text-risk-low hover:bg-risk-low/10 hover:text-risk-low border-transparent hover:border-risk-low/30',
    remove:  'text-risk-critical hover:bg-risk-critical/10 hover:text-risk-critical border-transparent hover:border-risk-critical/30',
    hold:    'text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 border-transparent hover:border-amber-400/30',
    report:  'text-risk-medium hover:bg-risk-medium/10 hover:text-risk-medium border-transparent hover:border-risk-medium/30',
    more:    'text-text-muted hover:bg-bg-tertiary hover:text-text-secondary border-transparent hover:border-border',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-all
        disabled:opacity-40 disabled:cursor-not-allowed
        ${styles[variant] ?? ''}
      `}
    >
      {icon} {label}
    </button>
  );
}

function FilterGroup<T extends string>({
  label, options, value, onChange,
}: { label: string; options: T[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-text-muted text-xs">{label}:</span>
      {options.map(opt => (
        <button
          key={opt}
          onClick={() => onChange(opt)}
          className={`text-xs px-2.5 py-1 rounded-lg transition-all ${
            value === opt
              ? 'bg-reddit-orange text-white font-medium'
              : 'text-text-muted hover:text-text-secondary hover:bg-bg-tertiary'
          }`}
        >
          {opt === 'all' ? 'All' : opt.charAt(0).toUpperCase() + opt.slice(1).toLowerCase()}
        </button>
      ))}
    </div>
  );
}

function ActionModal({
  author, onConfirm, onClose,
}: {
  author: string;
  onConfirm: (action: ActionType, reason?: string, banDuration?: number) => void;
  onClose: () => void;
}) {
  const [action, setAction] = useState<ActionType>('ban');
  const [reason, setReason] = useState('');
  const [banDuration, setBanDuration] = useState(30);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-bg-card border border-border rounded-2xl p-6 w-full max-w-sm animate-slide-in">
        <h3 className="text-text-primary font-bold mb-1">Advanced Action</h3>
        <p className="text-text-muted text-sm mb-5">u/{author}</p>

        <div className="space-y-3">
          <div>
            <label className="text-text-secondary text-xs font-medium block mb-1.5">Action</label>
            <select
              value={action}
              onChange={e => setAction(e.target.value as ActionType)}
              className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
            >
              <option value="ban">Ban user</option>
              <option value="mute">Mute user</option>
              <option value="remove">Remove content</option>
              <option value="lock">Lock post</option>
              <option value="distinguish">Distinguish (mod)</option>
            </select>
          </div>

          {action === 'ban' && (
            <div>
              <label className="text-text-secondary text-xs font-medium block mb-1.5">
                Ban duration (days, 0 = permanent)
              </label>
              <input
                type="number"
                min={0}
                max={999}
                value={banDuration}
                onChange={e => setBanDuration(Number(e.target.value))}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
              />
            </div>
          )}

          <div>
            <label className="text-text-secondary text-xs font-medium block mb-1.5">
              Reason (optional)
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              placeholder="Rule violation reason…"
              className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(action, reason || undefined, action === 'ban' ? banDuration || undefined : undefined)}
            className="flex-1 py-2.5 rounded-xl bg-risk-critical hover:bg-risk-critical/80 text-white font-semibold text-sm transition-colors"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <Loader2 size={24} className="animate-spin text-reddit-orange" />
      <p className="text-text-muted text-sm">Loading queue…</p>
    </div>
  );
}

function EmptyState({ filterStatus }: { filterStatus: FilterStatus }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <CheckCircle size={32} className="text-risk-low opacity-50" />
      <p className="text-text-secondary font-medium">
        {filterStatus === 'pending' ? 'Queue is clear!' : 'No items match your filters'}
      </p>
      <p className="text-text-muted text-xs">
        {filterStatus === 'pending' ? 'New posts and comments will appear here automatically' : 'Try changing the filters above'}
      </p>
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
