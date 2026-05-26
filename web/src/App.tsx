import { useState, useCallback, useEffect } from 'react';
import { useDevvit } from './hooks/useDevvit';
import { Sidebar } from './components/Sidebar';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { RuleBuilder } from './components/RuleBuilder';
import { ModNotes } from './components/ModNotes';
import { HealthPulse } from './components/HealthPulse';
import { UserProfileView } from './components/UserProfile';
import type {
  QueueItem, Rule, ModNote, HealthStats, AppConfig,
  UserProfile, DevvitToWebView, TabId,
  ActionType, NoteLabel, Toast,
} from './types';

// ─── Settings tab ─────────────────────────────────────────────────────────────

function SettingsTab({ config, onSave }: { config: AppConfig | null; onSave: (c: Partial<AppConfig>) => void }) {
  const [autoScore, setAutoScore] = useState(config?.autoScoreEnabled ?? true);
  const [autoAction, setAutoAction] = useState(config?.autoActionEnabled ?? false);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-text-primary font-bold text-lg">Settings</h2>
        <p className="text-text-muted text-xs mt-0.5">Configure ModSentinel for your subreddit</p>
      </div>
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* AI Key status */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-text-primary font-semibold text-sm mb-1">Anthropic API Key</h3>
          <p className="text-text-muted text-xs mb-3">
            Required for AI scoring. Set it in the Devvit app settings on the subreddit.
          </p>
          <div className={`flex items-center gap-2 text-sm font-medium ${
            config?.anthropicApiKeySet ? 'text-risk-low' : 'text-risk-medium'
          }`}>
            <span>{config?.anthropicApiKeySet ? '✅ API key configured' : '⚠️ API key not set'}</span>
          </div>
          {!config?.anthropicApiKeySet && (
            <p className="text-text-muted text-xs mt-2">
              Go to your subreddit → Mod tools → Installed Apps → ModSentinel → App Settings
            </p>
          )}
        </div>

        {/* Automation settings */}
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <h3 className="text-text-primary font-semibold text-sm">Automation</h3>

          <ToggleSetting
            title="Auto-score new content"
            desc="Score every new post and comment automatically in the background"
            value={autoScore}
            onChange={v => { setAutoScore(v); onSave({ autoScoreEnabled: v }); }}
          />
          <ToggleSetting
            title="Auto-apply rules (live enforcement)"
            desc="Automatically take action when a rule matches. Enable only after testing."
            value={autoAction}
            onChange={v => { setAutoAction(v); onSave({ autoActionEnabled: v }); }}
            danger
          />
        </div>

        {/* About */}
        <div className="bg-bg-card border border-border rounded-xl p-4">
          <h3 className="text-text-primary font-semibold text-sm mb-3">About ModSentinel</h3>
          <div className="space-y-2 text-xs text-text-muted">
            <div className="flex justify-between">
              <span>Version</span><span className="text-text-secondary">1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Subreddit</span>
              <span className="text-text-secondary">r/{config?.subreddit}</span>
            </div>
            <div className="flex justify-between">
              <span>Installed by</span>
              <span className="text-text-secondary">u/{config?.installedBy || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>Rule engine</span>
              <span className="text-text-secondary">ContextMod-compatible</span>
            </div>
            <div className="flex justify-between">
              <span>AI model</span>
              <span className="text-text-secondary">claude-haiku-4-5</span>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border text-xs text-text-muted text-center">
            Built for the Devvit Hackathon 2025 🏆
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleSetting({
  title, desc, value, onChange, danger,
}: { title: string; desc: string; value: boolean; onChange: (v: boolean) => void; danger?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${danger ? 'text-risk-high' : 'text-text-primary'}`}>{title}</div>
        <div className="text-xs text-text-muted mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`flex-shrink-0 w-10 h-6 rounded-full transition-colors relative ${
          value ? (danger ? 'bg-risk-high' : 'bg-reddit-orange') : 'bg-bg-tertiary'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${
          value ? 'left-5' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

// ─── Toast system ─────────────────────────────────────────────────────────────

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {toasts.map(t => (
        <div
          key={t.id}
          className={`
            px-4 py-3 rounded-xl text-sm font-medium shadow-lg animate-slide-in max-w-xs
            ${t.type === 'success' ? 'bg-risk-low text-white' :
              t.type === 'error' ? 'bg-risk-critical text-white' :
              t.type === 'warning' ? 'bg-risk-medium text-black' :
              'bg-bg-card border border-border text-text-primary'
            }
          `}
        >
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export function App() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [initialized, setInitialized] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [username, setUsername] = useState('');
  const [subreddit, setSubreddit] = useState('');

  const [activeTab, setActiveTab] = useState<TabId>('queue');

  // Queue
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [queueLoading, setQueueLoading] = useState(false);
  const [scoringIds, setScoringIds] = useState<Set<string>>(new Set());
  const [actingIds, setActingIds] = useState<Set<string>>(new Set());

  // Rules
  const [rules, setRules] = useState<Rule[]>([]);
  const [rulesSaving, setRulesSaving] = useState(false);

  // Notes
  const [activeNotesId, setActiveNotesId] = useState<string | null>(null);
  const [activeNotes, setActiveNotes] = useState<ModNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteAdding, setNoteAdding] = useState(false);

  // Health
  const [healthStats, setHealthStats] = useState<HealthStats | null>(null);
  const [healthLoading, setHealthLoading] = useState(false);

  // User profile
  const [viewingUser, setViewingUser] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userLoading, setUserLoading] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = `toast_${Date.now()}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── Devvit message handler ─────────────────────────────────────────────────
  const handleDevvitMessage = useCallback((msg: DevvitToWebView) => {
    switch (msg.type) {
      case 'INIT_DATA':
        setConfig(msg.config);
        setUsername(msg.username);
        setSubreddit(msg.subreddit);
        setIsMod(msg.isMod);
        setInitialized(true);
        break;

      case 'QUEUE_DATA':
        setQueueItems(msg.items);
        setQueueLoading(false);
        break;

      case 'SCORE_RESULT':
        setQueueItems(prev => prev.map(i => i.id === msg.itemId ? { ...i, aiScore: msg.score } : i));
        setScoringIds(prev => { const s = new Set(prev); s.delete(msg.itemId); return s; });
        break;

      case 'ACTION_COMPLETE':
        setActingIds(prev => { const s = new Set(prev); s.delete(msg.itemId); return s; });
        if (msg.success) {
          const statusMap: Record<string, QueueItem['status']> = {
            approve: 'approved', remove: 'removed', hold: 'held',
          };
          const newStatus = statusMap[msg.action] as QueueItem['status'] | undefined;
          if (newStatus) {
            setQueueItems(prev => prev.map(i => i.id === msg.itemId ? { ...i, status: newStatus } : i));
          }
          showToast(`✅ ${msg.action.charAt(0).toUpperCase() + msg.action.slice(1)} successful`, 'success');
        } else {
          showToast(`❌ Action failed: ${msg.error ?? 'unknown error'}`, 'error');
        }
        break;

      case 'NOTE_SAVED':
        setActiveNotes(prev => [msg.note, ...prev]);
        setNoteAdding(false);
        showToast('📝 Note saved', 'success');
        break;

      case 'NOTES_DATA':
        setActiveNotes(msg.notes);
        setActiveNotesId(msg.thingId);
        setNotesLoading(false);
        break;

      case 'RULES_DATA':
        setRules(msg.rules);
        break;

      case 'RULES_SAVED':
        setRulesSaving(false);
        if (msg.success) showToast('✅ Rules saved', 'success');
        break;

      case 'HEALTH_DATA':
        setHealthStats(msg.stats);
        setHealthLoading(false);
        break;

      case 'USER_DATA':
        setUserProfile(msg.user);
        setUserLoading(false);
        break;

      case 'CONFIG_DATA':
        setConfig(msg.config);
        break;

      case 'CONFIG_SAVED':
        showToast('⚙️ Settings saved', 'success');
        break;

      case 'SETUP_COMPLETE':
        setConfig(prev => prev ? { ...prev, setupComplete: true } : prev);
        showToast('🚀 ModSentinel is live!', 'success');
        break;

      case 'ERROR':
        showToast(`❌ ${msg.message}`, 'error');
        break;
    }
  }, [showToast]);

  const { send } = useDevvit(handleDevvitMessage);

  // ── Initialize on mount ────────────────────────────────────────────────────
  useEffect(() => {
    send({ type: 'INIT' });
  }, [send]);

  // ── Load tab data on first visit ──────────────────────────────────────────
  useEffect(() => {
    if (!initialized) return;
    if (activeTab === 'queue' && queueItems.length === 0) {
      setQueueLoading(true);
      send({ type: 'LOAD_QUEUE' });
    }
    if (activeTab === 'rules' && rules.length === 0) {
      send({ type: 'LOAD_RULES' });
    }
    if (activeTab === 'health' && !healthStats) {
      setHealthLoading(true);
      send({ type: 'LOAD_HEALTH' });
    }
  }, [activeTab, initialized]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAction = useCallback((itemId: string, action: ActionType, reason?: string, banDuration?: number) => {
    setActingIds(prev => new Set([...prev, itemId]));
    send({ type: 'TAKE_ACTION', itemId, action, reason, banDuration: action === 'ban' ? banDuration : undefined });
  }, [send]);

  const handleBulkAction = useCallback((ids: string[], action: ActionType) => {
    ids.forEach(id => {
      setActingIds(prev => new Set([...prev, id]));
      send({ type: 'TAKE_ACTION', itemId: id, action });
    });
  }, [send]);

  const handleScore = useCallback((item: QueueItem) => {
    setScoringIds(prev => new Set([...prev, item.id]));
    send({ type: 'SCORE_ITEM', itemId: item.id, itemType: item.type, title: item.title, body: item.body });
  }, [send]);

  const handleScoreAll = useCallback(() => {
    const unscored = queueItems.filter(i => i.status === 'pending' && !i.aiScore);
    unscored.forEach(item => {
      setScoringIds(prev => new Set([...prev, item.id]));
      send({ type: 'SCORE_ITEM', itemId: item.id, itemType: item.type, title: item.title, body: item.body });
    });
  }, [queueItems, send]);

  const handleViewUser = useCallback((username: string) => {
    setViewingUser(username);
    setUserProfile(null);
    setUserLoading(true);
    send({ type: 'LOAD_USER', username });
  }, [send]);

  const handleAddNote = useCallback((
    thingId: string,
    thingType: 'post' | 'comment' | 'user',
    content: string,
    label: NoteLabel,
  ) => {
    setNoteAdding(true);
    send({ type: 'ADD_NOTE', thingId, thingType, content, label });
  }, [send]);

  const handleLoadNotes = useCallback((thingId: string) => {
    setNotesLoading(true);
    setActiveNotesId(thingId);
    send({ type: 'GET_NOTES', thingId });
  }, [send]);

  const handleSaveRules = useCallback((r: Rule[]) => {
    setRulesSaving(true);
    send({ type: 'SAVE_RULES', rules: r });
  }, [send]);

  const handleOpenLink = useCallback((permalink: string) => {
    send({ type: 'OPEN_PERMALINK', permalink });
  }, [send]);

  // ── Render loading splash ──────────────────────────────────────────────────
  if (!initialized) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg-primary">
        <div className="text-center">
          <div className="w-16 h-16 bg-reddit-orange rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse-subtle">
            <span className="text-2xl">🛡️</span>
          </div>
          <div className="text-text-primary font-bold text-xl">ModSentinel</div>
          <div className="text-text-muted text-sm mt-1">Initializing…</div>
        </div>
      </div>
    );
  }

  // ── Mod gate ──────────────────────────────────────────────────────────────
  if (!isMod) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-bg-primary">
        <div className="text-center px-8">
          <div className="w-20 h-20 bg-risk-critical/10 border border-risk-critical/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔒</span>
          </div>
          <div className="text-text-primary font-bold text-xl mb-2">Moderators Only</div>
          <div className="text-text-muted text-sm max-w-xs mx-auto">
            ModSentinel is available to subreddit moderators only. Log in with a mod account to access the dashboard.
          </div>
        </div>
      </div>
    );
  }

  // ── Render onboarding ──────────────────────────────────────────────────────
  if (!config?.setupComplete) {
    return (
      <>
        <Onboarding
          hasApiKey={config?.anthropicApiKeySet ?? false}
          onComplete={() => send({ type: 'COMPLETE_SETUP' })}
        />
        <ToastContainer toasts={toasts} />
      </>
    );
  }

  // ── Render user profile overlay ────────────────────────────────────────────
  if (viewingUser) {
    return (
      <div className="h-full w-full bg-bg-primary flex">
        <Sidebar
          activeTab={activeTab}
          onTabChange={tab => { setActiveTab(tab); setViewingUser(null); }}
          subreddit={subreddit}
          username={username}
          queueDepth={queueItems.filter(i => i.status === 'pending').length}
        />
        <div className="flex-1 min-w-0">
          <UserProfileView
            user={userProfile}
            loading={userLoading}
            onBack={() => setViewingUser(null)}
            onAddNote={handleAddNote}
            onLoadNotes={handleLoadNotes}
            activeNotes={activeNotes}
            loadingNotes={notesLoading}
            addingNote={noteAdding}
            onTakeAction={handleAction}
            onOpenLink={handleOpenLink}
          />
        </div>
      </div>
    );
  }

  // ── Main layout ────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full bg-bg-primary flex">
      <Sidebar
        activeTab={activeTab}
        onTabChange={tab => {
          setActiveTab(tab);
          if (tab === 'queue' && queueItems.length === 0) {
            setQueueLoading(true);
            send({ type: 'LOAD_QUEUE' });
          }
          if (tab === 'rules' && rules.length === 0) {
            send({ type: 'LOAD_RULES' });
          }
          if (tab === 'health') {
            setHealthLoading(true);
            send({ type: 'LOAD_HEALTH' });
          }
        }}
        subreddit={subreddit}
        username={username}
        queueDepth={queueItems.filter(i => i.status === 'pending').length}
      />

      {/* Main content */}
      <main className="flex-1 min-w-0 flex flex-col h-full overflow-hidden">
        {activeTab === 'queue' && (
          <Dashboard
            items={queueItems}
            loading={queueLoading}
            onRefresh={() => { setQueueLoading(true); send({ type: 'LOAD_QUEUE' }); }}
            onAction={handleAction}
            onBulkAction={handleBulkAction}
            onScore={handleScore}
            onScoreAll={handleScoreAll}
            onViewUser={handleViewUser}
            onOpenLink={handleOpenLink}
            scoringIds={scoringIds}
            actingIds={actingIds}
          />
        )}

        {activeTab === 'rules' && (
          <RuleBuilder
            rules={rules}
            onSave={handleSaveRules}
            saving={rulesSaving}
          />
        )}

        {activeTab === 'notes' && (
          <ModNotes
            onLoadNotes={handleLoadNotes}
            onAddNote={handleAddNote}
            activeThingId={activeNotesId}
            activeNotes={activeNotes}
            loadingNotes={notesLoading}
            addingNote={noteAdding}
          />
        )}

        {activeTab === 'health' && (
          <HealthPulse
            stats={healthStats}
            loading={healthLoading}
            onRefresh={() => { setHealthLoading(true); send({ type: 'LOAD_HEALTH' }); }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            config={config}
            onSave={patch => send({ type: 'SAVE_CONFIG', config: patch })}
          />
        )}
      </main>

      <ToastContainer toasts={toasts} />
    </div>
  );
}
