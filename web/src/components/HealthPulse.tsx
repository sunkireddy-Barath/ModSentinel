import { RefreshCw, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  BarChart, Bar, ResponsiveContainer, Legend,
} from 'recharts';
import type { HealthStats } from '../types';

interface HealthPulseProps {
  stats: HealthStats | null;
  loading: boolean;
  onRefresh: () => void;
}

const CHART_COLORS = {
  removed:  '#ef4444',
  approved: '#22c55e',
  ai:       '#8b5cf6',
  queue:    '#f97316',
};


export function HealthPulse({ stats, loading, onRefresh }: HealthPulseProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-text-primary font-bold text-lg">Community Health Pulse</h2>
          <p className="text-text-muted text-xs mt-0.5">
            {stats
              ? `Last updated ${relativeTime(stats.generatedAt)}`
              : 'Real-time community analytics'
            }
          </p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 text-text-secondary hover:text-text-primary text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading && !stats ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 size={24} className="animate-spin text-reddit-orange" />
          </div>
        ) : !stats ? (
          <EmptyHealth onRefresh={onRefresh} />
        ) : (
          <div className="space-y-6 animate-fade-in">
            {/* KPI cards */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard
                title="Queue Depth"
                value={stats.queueDepth}
                unit="items"
                trend={stats.queueDepth > 20 ? 'up' : stats.queueDepth < 5 ? 'down' : 'flat'}
                trendLabel={stats.queueDepth > 20 ? 'High volume' : 'Normal'}
                highlight={stats.queueDepth > 20}
              />
              <KpiCard
                title="Removal Rate"
                value={stats.removalRate}
                unit="%"
                trend={stats.removalRate > 30 ? 'up' : 'flat'}
                trendLabel={`${stats.removedPosts} removed`}
              />
              <KpiCard
                title="AI Content"
                value={stats.aiGeneratedPercent}
                unit="%"
                trend={stats.aiGeneratedPercent > 20 ? 'up' : 'flat'}
                trendLabel={`${stats.aiGeneratedSuspected} suspected`}
                highlight={stats.aiGeneratedPercent > 20}
              />
              <KpiCard
                title="Avg Review"
                value={stats.avgReviewTimeMins.toFixed(1)}
                unit="min"
                trend="down"
                trendLabel="vs. 8 min manual"
                positive
              />
            </div>

            {/* Trend chart */}
            {stats.trend.length > 0 && (
              <ChartCard title="7-Day Activity Trend">
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={stats.trend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradRemoved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.removed} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.removed} stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS.approved} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={CHART_COLORS.approved} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      tickFormatter={d => d.slice(5)}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: '#6b7280', fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{ background: '#1e2128', border: '1px solid #2d3139', borderRadius: 12 }}
                      labelStyle={{ color: '#9ca3af', fontSize: 12 }}
                      itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: '#9ca3af' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="removed"
                      name="Removed"
                      stroke={CHART_COLORS.removed}
                      fill="url(#gradRemoved)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="approved"
                      name="Approved"
                      stroke={CHART_COLORS.approved}
                      fill="url(#gradApproved)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Top violations */}
              {stats.topViolations.length > 0 && (
                <ChartCard title="Top Rule Violations">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={stats.topViolations}
                      layout="vertical"
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" horizontal={false} />
                      <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="rule"
                        tick={{ fill: '#9ca3af', fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        width={100}
                        tickFormatter={v => v.length > 14 ? v.slice(0, 14) + '…' : v}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1e2128', border: '1px solid #2d3139', borderRadius: 12 }}
                        itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                      />
                      <Bar dataKey="count" name="Matches" fill={CHART_COLORS.removed} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {/* Mod activity */}
              {stats.modActivity.length > 0 && (
                <ChartCard title="Mod Team Activity">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart
                      data={stats.modActivity}
                      margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3139" />
                      <XAxis
                        dataKey="mod"
                        tick={{ fill: '#6b7280', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={v => v.length > 10 ? v.slice(0, 10) + '…' : v}
                      />
                      <YAxis tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: '#1e2128', border: '1px solid #2d3139', borderRadius: 12 }}
                        itemStyle={{ color: '#e5e7eb', fontSize: 12 }}
                      />
                      <Bar dataKey="actions" name="Actions" fill={CHART_COLORS.approved} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {/* Most actioned users */}
            {stats.mostActioned.length > 0 && (
              <ChartCard title="Most Actioned Users (7d)">
                <div className="space-y-2">
                  {stats.mostActioned.map((u, i) => (
                    <div key={u.username} className="flex items-center gap-3">
                      <span className="text-text-muted text-xs w-4 text-right">{i + 1}.</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-text-primary text-sm">u/{u.username}</span>
                          <span className="text-text-muted text-xs">{u.count} action{u.count !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-reddit-orange rounded-full"
                            style={{ width: `${(u.count / (stats.mostActioned[0]?.count ?? 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ChartCard>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  title, value, unit, trend, trendLabel, highlight, positive,
}: {
  title: string;
  value: number | string;
  unit: string;
  trend: 'up' | 'down' | 'flat';
  trendLabel: string;
  highlight?: boolean;
  positive?: boolean;
}) {
  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = positive
    ? 'text-risk-low'
    : trend === 'up' ? 'text-risk-critical' : trend === 'down' ? 'text-risk-low' : 'text-text-muted';

  return (
    <div className={`bg-bg-card border rounded-xl p-4 ${highlight ? 'border-reddit-orange/30' : 'border-border'}`}>
      <div className="text-text-muted text-xs font-medium mb-1">{title}</div>
      <div className="flex items-end gap-1 mb-1.5">
        <span className={`text-2xl font-bold ${highlight ? 'text-reddit-orange' : 'text-text-primary'}`}>
          {value}
        </span>
        <span className="text-text-muted text-sm mb-0.5">{unit}</span>
      </div>
      <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
        <TrendIcon size={11} />
        <span>{trendLabel}</span>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-card border border-border rounded-xl p-4">
      <h3 className="text-text-secondary text-sm font-semibold mb-4">{title}</h3>
      {children}
    </div>
  );
}

function EmptyHealth({ onRefresh }: { onRefresh: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center py-16">
      <div className="w-16 h-16 bg-bg-secondary rounded-2xl flex items-center justify-center mb-4">
        <TrendingUp size={28} className="text-text-muted opacity-40" />
      </div>
      <p className="text-text-secondary font-medium mb-2">No health data yet</p>
      <p className="text-text-muted text-sm mb-6">
        Health analytics are computed from your moderation activity over time.
      </p>
      <button
        onClick={onRefresh}
        className="px-5 py-2.5 bg-reddit-orange hover:bg-reddit-orangeHover text-white rounded-xl text-sm font-medium transition-colors"
      >
        Generate Report
      </button>
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
