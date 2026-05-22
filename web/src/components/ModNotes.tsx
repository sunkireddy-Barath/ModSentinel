import { useState } from 'react';
import {
  Search, Plus, Tag, User, FileText, Clock, ChevronRight, Loader2,
} from 'lucide-react';
import type { ModNote, NoteLabel } from '../types';

interface ModNotesProps {
  onLoadNotes: (thingId: string) => void;
  onAddNote: (thingId: string, thingType: 'post' | 'comment' | 'user', content: string, label: NoteLabel) => void;
  activeThingId: string | null;
  activeNotes: ModNote[];
  loadingNotes: boolean;
  addingNote: boolean;
}

const LABEL_CONFIG: Record<NoteLabel, { label: string; color: string; bg: string }> = {
  spam:    { label: 'Spam',    color: 'text-risk-critical', bg: 'bg-risk-critical/10 border-risk-critical/30' },
  abuse:   { label: 'Abuse',   color: 'text-risk-high',     bg: 'bg-risk-high/10 border-risk-high/30' },
  warning: { label: 'Warning', color: 'text-risk-medium',   bg: 'bg-risk-medium/10 border-risk-medium/30' },
  helpful: { label: 'Helpful', color: 'text-risk-low',      bg: 'bg-risk-low/10 border-risk-low/30' },
  watch:   { label: 'Watch',   color: 'text-risk-safe',     bg: 'bg-risk-safe/10 border-risk-safe/30' },
  info:    { label: 'Info',    color: 'text-purple-400',    bg: 'bg-purple-400/10 border-purple-400/30' },
};


export function ModNotes({
  onLoadNotes, onAddNote, activeThingId, activeNotes, loadingNotes, addingNote,
}: ModNotesProps) {
  const [search, setSearch] = useState('');
  const [thingType, setThingType] = useState<'user' | 'post' | 'comment'>('user');
  const [noteContent, setNoteContent] = useState('');
  const [noteLabel, setNoteLabel] = useState<NoteLabel>('info');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!search.trim()) return;
    onLoadNotes(search.trim());
    setShowAddForm(false);
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim() || !activeThingId) return;
    onAddNote(activeThingId, thingType, noteContent.trim(), noteLabel);
    setNoteContent('');
    setShowAddForm(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <h2 className="text-text-primary font-bold text-lg">Mod Notes</h2>
        <p className="text-text-muted text-xs mt-0.5">
          Collaborative notes shared across your entire mod team
        </p>
      </div>

      {/* Search */}
      <div className="px-5 py-4 border-b border-border flex-shrink-0">
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by username or post ID…"
              className="w-full bg-bg-secondary border border-border rounded-xl pl-9 pr-3 py-2.5 text-text-primary text-sm focus:outline-none focus:border-reddit-orange placeholder:text-text-muted"
            />
          </div>
          <div className="flex rounded-xl border border-border overflow-hidden">
            {(['user', 'post'] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setThingType(t)}
                className={`px-3 text-sm transition-colors ${
                  thingType === t
                    ? 'bg-reddit-orange text-white font-medium'
                    : 'bg-bg-secondary text-text-muted hover:bg-bg-tertiary'
                }`}
              >
                {t === 'user' ? <User size={14} /> : <FileText size={14} />}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-reddit-orange hover:bg-reddit-orangeHover text-white rounded-xl text-sm font-medium transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </form>
      </div>

      {/* Notes content */}
      <div className="flex-1 overflow-y-auto">
        {loadingNotes ? (
          <div className="flex items-center justify-center h-24">
            <Loader2 size={20} className="animate-spin text-reddit-orange" />
          </div>
        ) : activeThingId ? (
          <div>
            {/* Subject header */}
            <div className="px-5 py-3 border-b border-border flex items-center justify-between bg-bg-secondary/50">
              <div className="flex items-center gap-2">
                <User size={14} className="text-text-muted" />
                <span className="text-text-secondary text-sm font-medium">
                  {thingType === 'user' ? 'u/' : ''}{activeThingId}
                </span>
                <span className="text-text-muted text-xs">
                  {activeNotes.length} note{activeNotes.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                onClick={() => setShowAddForm(v => !v)}
                className="flex items-center gap-1.5 text-xs text-reddit-orange hover:text-reddit-orangeHover font-medium"
              >
                <Plus size={14} />
                Add Note
              </button>
            </div>

            {/* Add note form */}
            {showAddForm && (
              <form onSubmit={handleAddNote} className="px-5 py-4 bg-bg-card border-b border-border animate-slide-in">
                <div className="flex gap-2 mb-3">
                  {(Object.entries(LABEL_CONFIG) as [NoteLabel, typeof LABEL_CONFIG[NoteLabel]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNoteLabel(key)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-all ${
                        noteLabel === key
                          ? `${cfg.bg} ${cfg.color} font-semibold`
                          : 'border-border text-text-muted hover:border-border/80'
                      }`}
                    >
                      {cfg.label}
                    </button>
                  ))}
                </div>
                <textarea
                  value={noteContent}
                  onChange={e => setNoteContent(e.target.value)}
                  placeholder="Write your note here…"
                  rows={3}
                  autoFocus
                  className="w-full bg-bg-secondary border border-border rounded-xl px-4 py-3 text-text-primary text-sm focus:outline-none focus:border-reddit-orange resize-none placeholder:text-text-muted"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="flex-1 py-2 rounded-xl border border-border text-text-secondary hover:text-text-primary text-sm transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={!noteContent.trim() || addingNote}
                    className="flex-1 py-2 rounded-xl bg-reddit-orange hover:bg-reddit-orangeHover disabled:opacity-50 text-white font-semibold text-sm transition-colors"
                  >
                    {addingNote ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save Note'}
                  </button>
                </div>
              </form>
            )}

            {/* Notes list */}
            {activeNotes.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <FileText size={28} className="mx-auto mb-3 text-text-muted opacity-40" />
                <p className="text-text-muted text-sm">No notes yet</p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mt-3 text-xs text-reddit-orange hover:text-reddit-orangeHover"
                >
                  Add the first note →
                </button>
              </div>
            ) : (
              <div className="divide-y divide-border/40">
                {activeNotes.map(note => (
                  <NoteCard key={note.id} note={note} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <EmptyNotesState onSearch={(q) => { setSearch(q); onLoadNotes(q); }} />
        )}
      </div>
    </div>
  );
}

function NoteCard({ note }: { note: ModNote }) {
  const cfg = LABEL_CONFIG[note.label];

  return (
    <div className="px-5 py-4 hover:bg-bg-hover/20 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.bg} ${cfg.color}`}>
            {cfg.label}
          </span>
          <span className="text-text-secondary text-xs font-medium">
            u/{note.authorMod}
          </span>
        </div>
        <span className="text-text-muted text-xs flex-shrink-0 flex items-center gap-1">
          <Clock size={10} />
          {relativeTime(note.createdAt)}
        </span>
      </div>
      <p className="mt-2 text-text-secondary text-sm leading-relaxed">{note.content}</p>
    </div>
  );
}

function EmptyNotesState({ onSearch }: { onSearch: (q: string) => void }) {
  const examples = ['AutoModerator', 'spammer_123', 'suspicious_poster'];
  return (
    <div className="flex flex-col items-center justify-center h-full text-center px-8 py-12">
      <div className="w-16 h-16 bg-bg-secondary rounded-2xl flex items-center justify-center mb-4">
        <Tag size={28} className="text-text-muted opacity-50" />
      </div>
      <p className="text-text-secondary font-medium mb-2">Search for a user or post</p>
      <p className="text-text-muted text-sm mb-6">
        Type a username or post ID in the search box above to view and add notes.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {examples.map(ex => (
          <button
            key={ex}
            onClick={() => onSearch(ex)}
            className="text-xs text-reddit-orange border border-reddit-orange/30 px-3 py-1.5 rounded-full hover:bg-reddit-orange/10 transition-colors"
          >
            {ex}
          </button>
        ))}
      </div>
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
