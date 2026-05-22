import { Shield, List, BookOpen, Activity, Settings, ChevronRight, type LucideIcon } from 'lucide-react';
import type { TabId } from '../types';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  subreddit: string;
  username: string;
  queueDepth: number;
}

const tabs: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'queue',    label: 'Triage Queue',   icon: List },
  { id: 'rules',    label: 'Rule Builder',   icon: BookOpen },
  { id: 'notes',    label: 'Mod Notes',      icon: Shield },
  { id: 'health',   label: 'Health Pulse',   icon: Activity },
  { id: 'settings', label: 'Settings',       icon: Settings },
];

export function Sidebar({ activeTab, onTabChange, subreddit, username, queueDepth }: SidebarProps) {
  return (
    <aside className="w-56 flex-shrink-0 bg-bg-secondary border-r border-border flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-reddit-orange flex items-center justify-center flex-shrink-0">
            <Shield size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <div className="text-text-primary font-bold text-sm leading-tight">ModSentinel</div>
            <div className="text-text-muted text-xs truncate">r/{subreddit}</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-2 overflow-y-auto">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`
                w-full flex items-center justify-between px-3 py-2.5 mx-1 rounded-lg
                text-sm transition-all duration-150 group
                ${isActive
                  ? 'bg-reddit-orange/15 text-reddit-orange font-medium'
                  : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }
              `}
              style={{ width: 'calc(100% - 8px)' }}
            >
              <div className="flex items-center gap-2.5">
                <Icon
                  size={16}
                  className={isActive ? 'text-reddit-orange' : 'text-text-muted group-hover:text-text-secondary'}
                />
                <span>{tab.label}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {tab.id === 'queue' && queueDepth > 0 && (
                  <span className={`
                    text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center
                    ${queueDepth >= 10
                      ? 'bg-risk-critical/20 text-risk-critical'
                      : 'bg-bg-tertiary text-text-secondary'
                    }
                  `}>
                    {queueDepth > 99 ? '99+' : queueDepth}
                  </span>
                )}
                {isActive && <ChevronRight size={12} className="text-reddit-orange" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        {username && (
          <div className="text-xs text-text-muted text-center truncate mb-1">
            u/{username}
          </div>
        )}
        <div className="text-xs text-text-muted text-center">
          ModSentinel v1.0 · Claude AI
        </div>
      </div>
    </aside>
  );
}
