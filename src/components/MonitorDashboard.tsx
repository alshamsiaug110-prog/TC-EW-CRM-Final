import React from 'react';
import { DatabaseService } from '../services/db';
import { Lead, LeadStatus, LeadEntity, LeadPlatform, LeadPriority } from '../types';
import { ChartPie, CalendarRange, ListTodo, Activity, PhoneCall, TrendingUp, Layers, BadgeAlert, Database, RefreshCw, CheckCircle2, AlertTriangle, Server } from 'lucide-react';
import { motion } from 'motion/react';

export default function MonitorDashboard() {
  const [leads, setLeads] = React.useState<Lead[]>([]);
  const [diagResults, setDiagResults] = React.useState<{
    tableName: string;
    status: 'Healthy' | 'Error';
    rowCount: number;
    latencyMs: number;
    errorMessage?: string;
  }[]>([]);
  const [diagLoading, setDiagLoading] = React.useState(false);

  const runDiagnostics = React.useCallback(() => {
    setDiagLoading(true);
    DatabaseService.runDiagnostics()
      .then(setDiagResults)
      .catch(console.error)
      .finally(() => setDiagLoading(false));
  }, []);

  React.useEffect(() => {
    DatabaseService.getLeads().then(setLeads).catch(console.error);
    runDiagnostics();
  }, [runDiagnostics]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  // Filter leads to Today + Yesterday only
  const dashboardLeads = leads.filter(lead => {
    const leadDate = lead.createdAt.split('T')[0];
    return leadDate === todayStr || leadDate === yesterdayStr;
  });

  const todayLeads = dashboardLeads.filter(l => l.createdAt.split('T')[0] === todayStr);
  const yesterdayLeads = dashboardLeads.filter(l => l.createdAt.split('T')[0] === yesterdayStr);

  // Status distributions
  const statuses: Record<LeadStatus, number> = {
    'Pending Call Center': 0,
    'Under Follow-Up': 0,
    'Booked/Confirmed': 0,
    'Canceled': 0,
    'Re-engage Lead': 0,
  };

  // Entity distributions
  const entities: Record<LeadEntity, number> = {
    'Dr. Ihab': 0,
    'Eye World': 0,
    'Top Care': 0,
  };

  // Platform distributions
  const platforms: Record<LeadPlatform, number> = {
    'WhatsApp': 0,
    'Instagram': 0,
    'Facebook': 0,
    'TikTok': 0,
    'Referral': 0,
    'Other': 0,
  };

  // Priority distributions
  const priorities: Record<LeadPriority, number> = {
    'Hot': 0,
    'Warm': 0,
    'Cold': 0,
  };

  dashboardLeads.forEach(lead => {
    if (statuses[lead.status] !== undefined) statuses[lead.status]++;
    if (entities[lead.entity] !== undefined) entities[lead.entity]++;
    if (platforms[lead.platform] !== undefined) platforms[lead.platform]++;
    if (priorities[lead.priority] !== undefined) priorities[lead.priority]++;
  });

  // Extract recent timeline status changes for Today + Yesterday leads
  interface TimelineEvent {
    leadId: string;
    leadName: string;
    status: LeadStatus;
    changedBy: string;
    changedAt: string;
    notes?: string;
  }

  const timelineEvents: TimelineEvent[] = [];
  dashboardLeads.forEach(lead => {
    lead.statusHistory.forEach(hist => {
      const histDate = hist.changedAt.split('T')[0];
      if (histDate === todayStr || histDate === yesterdayStr) {
        timelineEvents.push({
          leadId: lead.id,
          leadName: lead.name,
          status: hist.status,
          changedBy: hist.changedBy,
          changedAt: hist.changedAt,
          notes: hist.notes
        });
      }
    });
  });

  // Sort timeline events chronologically (newest first)
  timelineEvents.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime());

  // Colors mapping for statuses in dark mode
  const statusColors: Record<LeadStatus, { bg: string; text: string; border: string }> = {
    'Pending Call Center': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    'Under Follow-Up': { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
    'Booked/Confirmed': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    'Canceled': { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
    'Re-engage Lead': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <ChartPie className="w-8 h-8 text-emerald-400" />
          <span>Live Lead Monitor</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-400 font-medium">
          Real-time clinic dashboard showing detailed overview performance metrics for <span className="font-semibold text-white">Today & Yesterday</span>.
        </p>
      </div>

      {/* Main Core Statistics Counters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Total Leads monitored</p>
            <p className="text-4xl font-extrabold text-white font-mono">{dashboardLeads.length}</p>
            <p className="text-xs text-neutral-500">Sum of Today & Yesterday</p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400">
            <CalendarRange className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Today's Inflow</p>
            <p className="text-4xl font-extrabold text-white font-mono">{todayLeads.length}</p>
            <p className="text-xs text-emerald-400 font-semibold">New entries logged today</p>
          </div>
          <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-indigo-400">
            <TrendingUp className="w-6 h-6" />
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -2 }}
          className="glass-panel p-6 rounded-2xl flex items-center justify-between shadow-xl"
        >
          <div className="space-y-1">
            <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Yesterday's Inflow</p>
            <p className="text-4xl font-extrabold text-white font-mono">{yesterdayLeads.length}</p>
            <p className="text-xs text-neutral-500">Recorded previous day</p>
          </div>
          <div className="bg-neutral-800 border border-neutral-700/50 p-4 rounded-xl text-neutral-400">
            <ListTodo className="w-6 h-6" />
          </div>
        </motion.div>
      </div>

      {/* Supabase Anon-Key Access Diagnostics */}
      <div className="glass-panel rounded-2xl p-6 shadow-xl border border-neutral-850/50 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Database className="w-5 h-5 text-emerald-400" />
              <span>Supabase Access & RLS Diagnostics</span>
            </h3>
            <p className="text-xs text-neutral-400">
              Verifies row access permission and real-time connectivity under current anonymous keys.
            </p>
          </div>
          <button
            onClick={runDiagnostics}
            disabled={diagLoading}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-bold rounded-xl border border-neutral-800 bg-neutral-950 hover:bg-neutral-900 active:bg-neutral-950 text-white transition-all disabled:opacity-50 cursor-pointer self-start sm:self-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${diagLoading ? 'animate-spin' : ''}`} />
            <span>{diagLoading ? 'Checking Access...' : 'Re-Run Checks'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {diagResults.map((result) => {
            const isHealthy = result.status === 'Healthy';
            return (
              <div
                key={result.tableName}
                className={`p-4 rounded-xl border ${
                  isHealthy
                    ? 'bg-emerald-500/5 border-emerald-500/10'
                    : 'bg-rose-500/5 border-rose-500/10'
                } flex flex-col justify-between space-y-3`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Server className={`w-4 h-4 ${isHealthy ? 'text-emerald-400' : 'text-rose-400'}`} />
                    <span className="font-mono text-xs font-bold text-white">{result.tableName}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    {isHealthy ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Active</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                        <span className="text-[10px] font-bold text-rose-400 uppercase">Blocked</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-[10px] text-neutral-500 font-medium">Row Count</p>
                    <p className="text-lg font-bold font-mono text-white">{isHealthy ? result.rowCount : '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-500 font-medium">Latency</p>
                    <p className="text-xs font-bold font-mono text-neutral-300">{result.latencyMs}ms</p>
                  </div>
                </div>

                {!isHealthy && result.errorMessage && (
                  <div className="p-2 bg-neutral-950/60 border border-neutral-900 rounded-lg text-[10px] text-rose-400 font-mono break-words leading-relaxed">
                    {result.errorMessage}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grid Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Status Breakdown Panel */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Conversion & Lead Status Distribution</span>
            </h3>

            <div className="space-y-4">
              {Object.entries(statuses).map(([status, count]) => {
                const total = dashboardLeads.length || 1;
                const pct = Math.round((count / total) * 100);
                const colors = statusColors[status as LeadStatus] || statusColors['Pending Call Center'];

                return (
                  <div key={status} className="space-y-1.5">
                    <div className="flex justify-between items-center text-xs">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold border ${colors.bg} ${colors.text} ${colors.border}`}>
                        {status}
                      </span>
                      <span className="font-mono font-bold text-neutral-300">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-neutral-950 border border-neutral-900 h-2.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full ${
                          status === 'Booked/Confirmed' ? 'bg-emerald-500' :
                          status === 'Pending Call Center' ? 'bg-indigo-500' :
                          status === 'Under Follow-Up' ? 'bg-amber-500' :
                          status === 'Re-engage Lead' ? 'bg-purple-500' :
                          'bg-neutral-600'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Platform & Priority Mini Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Priorities */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <BadgeAlert className="w-4 h-4 text-emerald-400" />
                <span>Priority breakdown</span>
              </h4>
              <div className="space-y-3">
                {Object.entries(priorities).map(([pri, count]) => {
                  const pct = Math.round((count / (dashboardLeads.length || 1)) * 100);
                  const color = pri === 'Hot' ? 'bg-rose-500' : pri === 'Warm' ? 'bg-amber-500' : 'bg-neutral-600';
                  return (
                    <div key={pri} className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-400">{pri}</span>
                      <div className="flex-1 mx-4 bg-neutral-950 border border-neutral-900 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono font-bold text-white">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channels */}
            <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl">
              <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>Inbound channels</span>
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                {Object.entries(platforms).map(([plat, count]) => (
                  <div key={plat} className="p-2.5 bg-neutral-950/40 border border-neutral-850 rounded-xl flex justify-between items-center">
                    <span className="font-semibold text-neutral-400">{plat}</span>
                    <span className="font-mono font-bold text-white bg-neutral-950 border border-neutral-800 px-1.5 py-0.5 rounded">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Timeline Activities Panel */}
        <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-xl">
          <h3 className="text-base font-bold text-white flex items-center space-x-2 border-b border-neutral-800 pb-3">
            <Activity className="w-5 h-5 text-emerald-400" />
            <span>Workflow Timeline Tracker</span>
          </h3>

          {timelineEvents.length === 0 ? (
            <div className="border border-dashed border-neutral-850 rounded-xl p-8 text-center text-neutral-500 space-y-2">
              <Activity className="w-8 h-8 mx-auto text-neutral-600" />
              <p className="text-xs font-semibold">No status logs recorded today</p>
              <p className="text-[10px]">Updates from moderators or agents will show up here live</p>
            </div>
          ) : (
            <div className="flow-root max-h-[420px] overflow-y-auto pr-1">
              <ul className="-mb-8">
                {timelineEvents.map((event, idx) => {
                  const colors = statusColors[event.status] || statusColors['Pending Call Center'];
                  return (
                    <li key={`${event.leadId}-${event.changedAt}-${idx}`}>
                      <div className="relative pb-8">
                        {idx !== timelineEvents.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-neutral-800" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className="h-8 w-8 rounded-full bg-neutral-950 border border-neutral-800 flex items-center justify-center text-neutral-300 font-bold text-xs">
                              {event.changedBy.slice(0, 1)}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-xs text-neutral-400 leading-relaxed">
                                <span className="font-semibold text-neutral-200">{event.changedBy}</span> changed status for{' '}
                                <span className="font-bold text-white">{event.leadName}</span> to{' '}
                                <span className={`px-2 py-0.2 rounded font-bold border ${colors.bg} ${colors.text} ${colors.border} text-[10px] inline-block mt-0.5`}>
                                  {event.status}
                                </span>
                              </p>
                              {event.notes && (
                                <p className="mt-1 bg-neutral-950 border border-neutral-900 text-neutral-400 text-[10px] p-1.5 rounded italic">
                                  "{event.notes}"
                                </p>
                              )}
                            </div>
                            <div className="text-right text-[10px] whitespace-nowrap text-neutral-500 font-mono">
                              {new Date(event.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
