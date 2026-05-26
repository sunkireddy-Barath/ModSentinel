import { useState, useRef, useEffect } from 'react';
import {
  Plus, Save, Trash2, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, ArrowUp, ArrowDown, AlertTriangle, Loader2,
  Copy, Download, Upload,
} from 'lucide-react';
import type { Rule, RuleCondition, RuleAction, ConditionField, ConditionOperator, ActionType } from '../types';

interface RuleBuilderProps {
  rules: Rule[];
  onSave: (rules: Rule[]) => void;
  saving: boolean;
}

const FIELD_LABELS: Record<ConditionField, string> = {
  account_age:        'Account Age (days)',
  karma:              'Total Karma',
  post_count_24h:     'Posts in 24h (this sub)',
  comment_count_24h:  'Comments in 24h',
  cross_sub_count_24h:'Cross-sub posts in 24h',
  ai_score:           'AI Risk Score',
  spam_score:         'Spam Score',
  report_count:       'Report Count',
  body_contains:      'Body Contains',
  title_contains:     'Title Contains',
  flair_text:         'Flair Text',
};

const NUMERIC_FIELDS: ConditionField[] = [
  'account_age', 'karma', 'post_count_24h', 'comment_count_24h',
  'cross_sub_count_24h', 'ai_score', 'spam_score', 'report_count',
];

const OPERATOR_OPTIONS = (field: ConditionField): Array<{ value: ConditionOperator; label: string }> => {
  if (NUMERIC_FIELDS.includes(field)) {
    return [
      { value: 'lt',  label: 'is less than' },
      { value: 'lte', label: 'is ≤' },
      { value: 'gt',  label: 'is greater than' },
      { value: 'gte', label: 'is ≥' },
      { value: 'eq',  label: 'equals' },
    ];
  }
  return [
    { value: 'contains',      label: 'contains' },
    { value: 'not_contains',  label: 'does not contain' },
    { value: 'matches_regex', label: 'matches regex' },
    { value: 'eq',            label: 'equals' },
  ];
};

const ACTION_LABELS: Record<ActionType, string> = {
  remove:     '🗑️ Remove',
  approve:    '✅ Approve',
  report:     '🚩 Report',
  hold:       '⏸️ Hold',
  ban:        '🔨 Ban User',
  mute:       '🔇 Mute User',
  flair:      '🏷️ Set Flair',
  lock:       '🔒 Lock',
  distinguish:'⭐ Distinguish',
};

function newRule(): Rule {
  return {
    id: `rule_${Date.now()}`,
    name: 'New Rule',
    description: '',
    enabled: true,
    appliesTo: 'both',
    conditionLogic: 'AND',
    conditions: [{ field: 'account_age', operator: 'lt', value: 30 }],
    action: { type: 'hold' },
    priority: 99,
    matchCount: 0,
  };
}

function newCondition(): RuleCondition {
  return { field: 'account_age', operator: 'lt', value: 30 };
}

export function RuleBuilder({ rules, onSave, saving }: RuleBuilderProps) {
  const [localRules, setLocalRules] = useState<Rule[]>(rules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const importRef = useRef<HTMLInputElement>(null);

  // Sync from prop when rules arrive after initial empty mount (async load)
  useEffect(() => {
    if (!dirty && rules.length > 0 && localRules.length === 0) {
      setLocalRules(rules);
    }
  }, [rules]);

  const update = (updated: Rule[]) => {
    setLocalRules(updated);
    setDirty(true);
  };

  const addRule = () => {
    const r = newRule();
    const updated = [...localRules, r];
    update(updated);
    setEditingId(r.id);
  };

  const deleteRule = (id: string) => {
    update(localRules.filter(r => r.id !== id));
    if (editingId === id) setEditingId(null);
  };

  const duplicateRule = (id: string) => {
    const src = localRules.find(r => r.id === id);
    if (!src) return;
    const copy: Rule = {
      ...src,
      id: `rule_${Date.now()}`,
      name: `${src.name} (copy)`,
      matchCount: 0,
      priority: src.priority + 1,
    };
    const idx = localRules.findIndex(r => r.id === id);
    const updated = [...localRules.slice(0, idx + 1), copy, ...localRules.slice(idx + 1)];
    update(updated);
    setEditingId(copy.id);
  };

  const toggleEnabled = (id: string) => {
    update(localRules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const updateRule = (id: string, patch: Partial<Rule>) => {
    update(localRules.map(r => r.id === id ? { ...r, ...patch } : r));
  };

  const moveRule = (id: string, dir: -1 | 1) => {
    const idx = localRules.findIndex(r => r.id === id);
    const next = idx + dir;
    if (next < 0 || next >= localRules.length) return;
    const reordered = [...localRules];
    [reordered[idx], reordered[next]] = [reordered[next], reordered[idx]];
    update(reordered);
  };

  const exportRules = () => {
    const blob = new Blob([JSON.stringify(localRules, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modsentinel-rules.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as unknown;
        if (!Array.isArray(parsed)) throw new Error('Expected a JSON array of rules');
        const imported = (parsed as Rule[]).map(r => ({
          ...r,
          id: `rule_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          matchCount: 0,
        }));
        update([...localRules, ...imported]);
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Rule Builder</h2>
          <p className="text-text-muted text-xs mt-0.5">
            ContextMod-compatible — {localRules.filter(r => r.enabled).length} active
            {localRules.reduce((s, r) => s + (r.matchCount ?? 0), 0) > 0 && (
              <span className="ml-2 text-reddit-orange">
                · {localRules.reduce((s, r) => s + (r.matchCount ?? 0), 0).toLocaleString()} total matches
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {importError && (
            <span className="text-xs text-risk-critical max-w-32 truncate" title={importError}>{importError}</span>
          )}
          {dirty && (
            <span className="text-xs text-amber-400">Unsaved</span>
          )}
          <input ref={importRef} type="file" accept=".json" className="hidden" onChange={handleImport} />
          <button
            onClick={() => importRef.current?.click()}
            title="Import rules from JSON"
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary border border-border px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Upload size={12} />Import
          </button>
          <button
            onClick={exportRules}
            title="Export rules as JSON"
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-secondary border border-border px-2.5 py-1.5 rounded-lg transition-colors"
          >
            <Download size={12} />Export
          </button>
          <button
            onClick={() => { onSave(localRules); setDirty(false); }}
            disabled={saving || !dirty}
            className="flex items-center gap-2 bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save
          </button>
        </div>
      </div>

      {/* Rules list */}
      <div className="flex-1 overflow-y-auto p-5 space-y-3">
        {localRules.length === 0 && (
          <div className="text-center py-12 text-text-muted">
            <AlertTriangle size={32} className="mx-auto mb-3 opacity-40" />
            <p>No rules yet. Add your first rule to start automating moderation.</p>
          </div>
        )}

        {localRules.map((rule, idx) => (
          <RuleCard
            key={rule.id}
            rule={rule}
            index={idx}
            total={localRules.length}
            isEditing={editingId === rule.id}
            onToggleEdit={() => setEditingId(id => id === rule.id ? null : rule.id)}
            onToggleEnabled={() => toggleEnabled(rule.id)}
            onDelete={() => deleteRule(rule.id)}
            onDuplicate={() => duplicateRule(rule.id)}
            onUpdate={(patch) => updateRule(rule.id, patch)}
            onMoveUp={() => moveRule(rule.id, -1)}
            onMoveDown={() => moveRule(rule.id, 1)}
          />
        ))}

        <button
          onClick={addRule}
          className="w-full py-3 border-2 border-dashed border-border hover:border-reddit-orange/50 rounded-xl text-text-muted hover:text-reddit-orange text-sm flex items-center justify-center gap-2 transition-all"
        >
          <Plus size={16} />
          Add Rule
        </button>
      </div>
    </div>
  );
}

// ─── RuleCard ─────────────────────────────────────────────────────────────────

function RuleCard({
  rule, index, total, isEditing, onToggleEdit, onToggleEnabled, onDelete, onDuplicate, onUpdate, onMoveUp, onMoveDown,
}: {
  rule: Rule;
  index: number;
  total: number;
  isEditing: boolean;
  onToggleEdit: () => void;
  onToggleEnabled: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onUpdate: (patch: Partial<Rule>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className={`bg-bg-card border rounded-xl transition-all ${
      rule.enabled ? 'border-border' : 'border-border/40 opacity-60'
    } ${isEditing ? 'border-reddit-orange/40' : ''}`}>
      {/* Rule header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex flex-col gap-0.5 flex-shrink-0">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="p-0.5 rounded hover:bg-bg-tertiary disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-text-secondary"
            title="Move up"
          >
            <ArrowUp size={12} />
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="p-0.5 rounded hover:bg-bg-tertiary disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-text-muted hover:text-text-secondary"
            title="Move down"
          >
            <ArrowDown size={12} />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {isEditing ? (
            <input
              value={rule.name}
              onChange={e => onUpdate({ name: e.target.value })}
              className="bg-transparent text-text-primary font-semibold text-sm w-full focus:outline-none border-b border-border focus:border-reddit-orange"
              placeholder="Rule name…"
              autoFocus
            />
          ) : (
            <div className="text-text-primary font-semibold text-sm">{rule.name}</div>
          )}
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
              rule.enabled ? 'bg-risk-low/10 text-risk-low' : 'bg-border text-text-muted'
            }`}>
              {rule.enabled ? 'Active' : 'Disabled'}
            </span>
            <span className="text-xs text-text-muted">{rule.appliesTo}</span>
            {rule.matchCount > 0 ? (
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                rule.matchCount >= 100 ? 'bg-risk-critical/15 text-risk-critical' :
                rule.matchCount >= 20 ? 'bg-risk-high/15 text-risk-high' :
                'bg-reddit-orange/15 text-reddit-orange'
              }`}>
                {rule.matchCount.toLocaleString()} hits
              </span>
            ) : (
              <span className="text-xs text-text-muted opacity-60">0 hits</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleEnabled}
            className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors"
            title={rule.enabled ? 'Disable rule' : 'Enable rule'}
          >
            {rule.enabled
              ? <ToggleRight size={18} className="text-risk-low" />
              : <ToggleLeft size={18} className="text-text-muted" />
            }
          </button>
          <button
            onClick={onDuplicate}
            title="Duplicate rule"
            className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted hover:text-text-primary"
          >
            <Copy size={14} />
          </button>
          <button
            onClick={onToggleEdit}
            className="p-1.5 hover:bg-bg-tertiary rounded-lg transition-colors text-text-muted hover:text-text-primary"
          >
            {isEditing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 hover:bg-risk-critical/10 rounded-lg transition-colors text-text-muted hover:text-risk-critical"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Summary row */}
      {!isEditing && (
        <div className="px-4 pb-3 text-xs text-text-muted">
          {rule.conditions.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="text-reddit-orange font-bold mx-1">{rule.conditionLogic}</span>}
              <span className="text-text-secondary">{FIELD_LABELS[c.field]}</span>
              {' '}
              <span className="text-text-muted">{c.operator}</span>
              {' '}
              <span className="text-text-primary font-medium">{String(c.value)}</span>
            </span>
          ))}
          <span className="mx-2 text-text-muted">→</span>
          <span className="text-text-primary font-medium">{ACTION_LABELS[rule.action.type]}</span>
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <div className="px-4 pb-4 space-y-4 animate-fade-in border-t border-border pt-4">
          {/* Description */}
          <div>
            <label className="text-text-muted text-xs font-medium block mb-1.5">Description</label>
            <input
              value={rule.description}
              onChange={e => onUpdate({ description: e.target.value })}
              className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-secondary text-sm focus:outline-none focus:border-reddit-orange"
              placeholder="What does this rule do?"
            />
          </div>

          {/* Applies to + Logic */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-text-muted text-xs font-medium block mb-1.5">Applies to</label>
              <select
                value={rule.appliesTo}
                onChange={e => onUpdate({ appliesTo: e.target.value as Rule['appliesTo'] })}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
              >
                <option value="both">Posts & Comments</option>
                <option value="posts">Posts only</option>
                <option value="comments">Comments only</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="text-text-muted text-xs font-medium block mb-1.5">Match logic</label>
              <select
                value={rule.conditionLogic}
                onChange={e => onUpdate({ conditionLogic: e.target.value as 'AND' | 'OR' })}
                className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
              >
                <option value="AND">ALL conditions must match</option>
                <option value="OR">ANY condition can match</option>
              </select>
            </div>
          </div>

          {/* Conditions */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-text-muted text-xs font-medium">Conditions</label>
              <button
                onClick={() => onUpdate({ conditions: [...rule.conditions, newCondition()] })}
                className="text-xs text-reddit-orange hover:text-reddit-orangeHover flex items-center gap-1"
              >
                <Plus size={12} /> Add condition
              </button>
            </div>
            <div className="space-y-2">
              {rule.conditions.map((cond, ci) => (
                <ConditionRow
                  key={ci}
                  condition={cond}
                  index={ci}
                  canDelete={rule.conditions.length > 1}
                  onUpdate={updated => {
                    const updated2 = [...rule.conditions];
                    updated2[ci] = updated;
                    onUpdate({ conditions: updated2 });
                  }}
                  onDelete={() => onUpdate({ conditions: rule.conditions.filter((_, i) => i !== ci) })}
                />
              ))}
            </div>
          </div>

          {/* Action */}
          <div>
            <label className="text-text-muted text-xs font-medium block mb-2">Action</label>
            <ActionEditor
              action={rule.action}
              onChange={action => onUpdate({ action })}
            />
          </div>

          {/* Priority */}
          <div>
            <label className="text-text-muted text-xs font-medium block mb-1.5">Priority (lower runs first)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={rule.priority}
              onChange={e => onUpdate({ priority: Number(e.target.value) })}
              className="w-24 bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ConditionRow({
  condition, index, canDelete, onUpdate, onDelete,
}: {
  condition: RuleCondition;
  index: number;
  canDelete: boolean;
  onUpdate: (c: RuleCondition) => void;
  onDelete: () => void;
}) {
  const isNumeric = NUMERIC_FIELDS.includes(condition.field);

  return (
    <div className="flex items-center gap-2">
      <select
        value={condition.field}
        onChange={e => {
          const f = e.target.value as ConditionField;
          const newOp = NUMERIC_FIELDS.includes(f) ? 'lt' : 'contains';
          onUpdate({ field: f, operator: newOp as ConditionOperator, value: NUMERIC_FIELDS.includes(f) ? 30 : '' });
        }}
        className="flex-1 bg-bg-secondary border border-border rounded-lg px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-reddit-orange"
      >
        {(Object.entries(FIELD_LABELS) as [ConditionField, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <select
        value={condition.operator}
        onChange={e => onUpdate({ ...condition, operator: e.target.value as ConditionOperator })}
        className="bg-bg-secondary border border-border rounded-lg px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-reddit-orange"
      >
        {OPERATOR_OPTIONS(condition.field).map(op => (
          <option key={op.value} value={op.value}>{op.label}</option>
        ))}
      </select>

      <input
        type={isNumeric ? 'number' : 'text'}
        value={condition.value}
        onChange={e => onUpdate({ ...condition, value: isNumeric ? Number(e.target.value) : e.target.value })}
        className="w-20 bg-bg-secondary border border-border rounded-lg px-2.5 py-2 text-text-primary text-xs focus:outline-none focus:border-reddit-orange"
        placeholder="value"
      />

      {canDelete && (
        <button
          onClick={onDelete}
          className="p-1.5 text-text-muted hover:text-risk-critical transition-colors"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}

function ActionEditor({
  action, onChange,
}: { action: RuleAction; onChange: (a: RuleAction) => void }) {
  return (
    <div className="space-y-2">
      <select
        value={action.type}
        onChange={e => onChange({ type: e.target.value as ActionType })}
        className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
      >
        {(Object.entries(ACTION_LABELS) as [ActionType, string][]).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      {(action.type === 'remove') && (
        <>
          <input
            value={action.removalReason ?? ''}
            onChange={e => onChange({ ...action, removalReason: e.target.value })}
            placeholder="Removal reason (shown in mod log)"
            className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-secondary text-sm focus:outline-none focus:border-reddit-orange"
          />
          <textarea
            value={action.removalMessage ?? ''}
            onChange={e => onChange({ ...action, removalMessage: e.target.value })}
            placeholder="Message to author (optional)"
            rows={2}
            className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-secondary text-sm focus:outline-none focus:border-reddit-orange resize-none"
          />
        </>
      )}

      {action.type === 'ban' && (
        <>
          <input
            type="number"
            value={action.banDuration ?? ''}
            onChange={e => onChange({ ...action, banDuration: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="Duration in days (leave blank for permanent)"
            className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-primary text-sm focus:outline-none focus:border-reddit-orange"
          />
          <textarea
            value={action.banMessage ?? ''}
            onChange={e => onChange({ ...action, banMessage: e.target.value })}
            placeholder="Message to banned user"
            rows={2}
            className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-secondary text-sm focus:outline-none focus:border-reddit-orange resize-none"
          />
        </>
      )}

      {action.type === 'report' && (
        <input
          value={action.reportReason ?? ''}
          onChange={e => onChange({ ...action, reportReason: e.target.value })}
          placeholder="Report reason"
          className="w-full bg-bg-secondary border border-border rounded-xl px-3 py-2 text-text-secondary text-sm focus:outline-none focus:border-reddit-orange"
        />
      )}
    </div>
  );
}
