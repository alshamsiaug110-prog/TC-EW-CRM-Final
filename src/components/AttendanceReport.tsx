import React, { useState, useEffect } from 'react';
import { DatabaseService } from '../services/db';
import { AuditLog, SystemUser, UserRole } from '../types';
import { 
  Clock, 
  Calendar, 
  User, 
  AlertTriangle, 
  CheckCircle, 
  Search, 
  RefreshCw, 
  Filter, 
  ArrowRight, 
  FileText,
  Activity,
  ChevronDown,
  ChevronUp,
  XCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Helper to convert UTC timestamp to Africa/Cairo date and time elements
function getCairoParts(utcString: string) {
  try {
    const date = new Date(utcString);
    if (isNaN(date.getTime())) {
      return { dateStr: 'Invalid Date', timeStr: 'Invalid Time', epoch: 0 };
    }
    
    // Format date specifically in Africa/Cairo
    const dtfDate = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    const dtfTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const dateStr = dtfDate.format(date); // "MM/DD/YYYY"
    const [m, d, y] = dateStr.split('/');
    const formattedDate = `${y}-${m}-${d}`; // "YYYY-MM-DD"

    const timeStr = dtfTime.format(date); // "HH:MM:SS"

    return {
      dateStr: formattedDate,
      timeStr,
      epoch: date.getTime(),
    };
  } catch (e) {
    console.error('Error parsing Cairo timezone details:', e);
    return { dateStr: 'Invalid Date', timeStr: 'Invalid Time', epoch: 0 };
  }
}

// Helper to format beautiful local Cairo time (e.g. 08:30 AM)
function formatCairoTime(utcString: string): string {
  try {
    const date = new Date(utcString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleTimeString('en-US', {
      timeZone: 'Africa/Cairo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return 'N/A';
  }
}

// Helper to format beautiful Cairo date (e.g. Mon, Jul 20, 2026)
function formatCairoDateString(dateStr: string): string {
  try {
    // dateStr is 'YYYY-MM-DD'
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch (e) {
    return dateStr;
  }
}

// Any gap between two logged actions longer than this counts as "sleep"
// (idle) time instead of active work time.
const SLEEP_GAP_MINUTES = 60;
// One hour of daily sleep time is treated as the employee's entitled break
// and is not counted against them.
const DAILY_BREAK_MINUTES = 60;

interface DailyAttendanceRow {
  dateStr: string; // YYYY-MM-DD
  user: string;
  role: UserRole;
  firstLogin: string | null; // UTC timestamp
  lastLogout: string | null; // UTC timestamp
  totalHours: number; // raw login -> logout duration, includes break & sleep
  activeHours: number; // time between actions where the gap was <= 60 min
  sleepHours: number; // time where the gap was > 60 min, minus the daily break
  hasAbnormal: boolean;
  isCurrentlyActive: boolean;
  sessionsCount: number;
}

export default function AttendanceReport() {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AuditLog[]>([]);
  const [allLogs, setAllLogs] = useState<AuditLog[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter Date states (defaulting to current month: from 1st of month to today)
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Expandable states for details view
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  // Initialize dates in Cairo timezone for today and 1st of month
  useEffect(() => {
    const nowInCairo = getCairoParts(new Date().toISOString());
    const [year, month] = nowInCairo.dateStr.split('-');
    setFromDate(`${year}-${month}-01`);
    setToDate(nowInCairo.dateStr);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const fetchedUsers = await DatabaseService.getUsers();
      setUsers(fetchedUsers);

      const [logs, everything] = await Promise.all([
        DatabaseService.getAttendanceLogs(),
        DatabaseService.getAllLogsForAttendance(),
      ]);
      setAttendanceLogs(logs);
      setAllLogs(everything);
    } catch (err: any) {
      console.error('Error fetching attendance data:', err);
      setErrorMsg(err.message || 'Failed to load attendance logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Compute live active status of users based on entire history (independent of date filter)
  const getUserLiveStatus = (userName: string) => {
    const userLogs = attendanceLogs.filter(l => l.user === userName);
    if (userLogs.length === 0) return { status: 'Logged Out', lastSeen: null };
    
    // Logs are sorted chronologically ascending, so the last one is the most recent
    const latest = userLogs[userLogs.length - 1];
    if (latest.action === 'Login') {
      return { status: 'Logged In', lastSeen: latest.timestamp };
    }
    return { status: 'Logged Out', lastSeen: latest.timestamp };
  };

  // Group and pair logs per user per day in Cairo timezone
  const getAttendanceRecords = (): DailyAttendanceRow[] => {
    const records: DailyAttendanceRow[] = [];

    // Filter logs for eligible users only
    const userNamesSet = new Set(users.map(u => u.name));
    const relevantLogs = attendanceLogs.filter(l => userNamesSet.has(l.user));

    // Group logs by user
    const logsByUser: { [key: string]: AuditLog[] } = {};
    relevantLogs.forEach(log => {
      if (!logsByUser[log.user]) {
        logsByUser[log.user] = [];
      }
      logsByUser[log.user].push(log);
    });

    // Walks every action this user took (any category) between two
    // timestamps, chronologically, and splits the elapsed time into
    // "active" (gap since the previous action <= SLEEP_GAP_MINUTES) and
    // "sleep" (gap > SLEEP_GAP_MINUTES - the whole gap counts, not just the
    // excess). Mirrors the login-open -> action -> action -> logout flow.
    const computeSessionActiveSleep = (
      userName: string,
      sessionStartIso: string,
      sessionEndIso: string
    ): { activeMinutes: number; sleepMinutesRaw: number } => {
      const startMs = new Date(sessionStartIso).getTime();
      const endMs = new Date(sessionEndIso).getTime();
      const actionsInSession = allLogs
        .filter(l => l.user === userName)
        .map(l => new Date(l.timestamp).getTime())
        .filter(t => t >= startMs && t <= endMs)
        .sort((a, b) => a - b);

      // Always walk starting from the login moment itself, then through
      // every subsequent action, then to the logout/now moment.
      const points = [startMs, ...actionsInSession, endMs];

      let activeMinutes = 0;
      let sleepMinutesRaw = 0;
      for (let i = 1; i < points.length; i++) {
        const gapMinutes = (points[i] - points[i - 1]) / (1000 * 60);
        if (gapMinutes <= 0) continue;
        if (gapMinutes > SLEEP_GAP_MINUTES) {
          sleepMinutesRaw += gapMinutes;
        } else {
          activeMinutes += gapMinutes;
        }
      }

      return { activeMinutes, sleepMinutesRaw };
    };

    // Pair logs chronologically per user
    Object.keys(logsByUser).forEach(userName => {
      const userLogs = logsByUser[userName];
      const userObj = users.find(u => u.name === userName);
      if (!userObj) return;

      const pairings: {
        loginTime: string;
        logoutTime: string | null;
        hours: number;
        activeMinutes: number;
        sleepMinutesRaw: number;
        isAbnormal: boolean;
        dateStr: string; // Cairo date of login
      }[] = [];

      for (let i = 0; i < userLogs.length; i++) {
        const log = userLogs[i];
        if (log.action === 'Login') {
          const nextLog = userLogs[i + 1];
          const loginCairo = getCairoParts(log.timestamp);

          if (nextLog && nextLog.action === 'Logout') {
            const logoutCairo = getCairoParts(nextLog.timestamp);
            const isAbnormal = nextLog.details === 'Auto-closed (abnormal end)';
            const hours = isAbnormal ? 0 : Math.max(0, (logoutCairo.epoch - loginCairo.epoch) / (1000 * 60 * 60));
            const breakdown = isAbnormal
              ? { activeMinutes: 0, sleepMinutesRaw: 0 }
              : computeSessionActiveSleep(userName, log.timestamp, nextLog.timestamp);

            pairings.push({
              loginTime: log.timestamp,
              logoutTime: nextLog.timestamp,
              hours,
              activeMinutes: breakdown.activeMinutes,
              sleepMinutesRaw: breakdown.sleepMinutesRaw,
              isAbnormal,
              dateStr: loginCairo.dateStr
            });
            i++; // skip logout log
          } else {
            // Unmatched login - user is currently live/active
            const breakdown = computeSessionActiveSleep(userName, log.timestamp, new Date().toISOString());
            pairings.push({
              loginTime: log.timestamp,
              logoutTime: null,
              hours: 0,
              activeMinutes: breakdown.activeMinutes,
              sleepMinutesRaw: breakdown.sleepMinutesRaw,
              isAbnormal: false,
              dateStr: loginCairo.dateStr
            });
          }
        }
      }

      // Group pairings of this user by Cairo dateStr
      const pairingsByDate: { [key: string]: typeof pairings } = {};
      pairings.forEach(p => {
        if (!pairingsByDate[p.dateStr]) {
          pairingsByDate[p.dateStr] = [];
        }
        pairingsByDate[p.dateStr].push(p);
      });

      // Construct daily records for this user
      Object.keys(pairingsByDate).forEach(dateKey => {
        const dayPairings = pairingsByDate[dateKey];
        
        // Find first login and last logout timestamps
        let firstLogin: string | null = null;
        let lastLogout: string | null = null;
        let totalHours = 0;
        let activeMinutesSum = 0;
        let sleepMinutesRawSum = 0;
        let hasAbnormal = false;
        let isCurrentlyActive = false;

        dayPairings.forEach(p => {
          if (!firstLogin || new Date(p.loginTime) < new Date(firstLogin)) {
            firstLogin = p.loginTime;
          }
          if (p.logoutTime) {
            if (!lastLogout || new Date(p.logoutTime) > new Date(lastLogout)) {
              lastLogout = p.logoutTime;
            }
          } else {
            isCurrentlyActive = true;
          }

          totalHours += p.hours;
          activeMinutesSum += p.activeMinutes;
          sleepMinutesRawSum += p.sleepMinutesRaw;
          if (p.isAbnormal) {
            hasAbnormal = true;
          }
        });

        // The employee is entitled to one hour of break per day; only the
        // sleep time beyond that counts as real idle time.
        const sleepMinutesReal = Math.max(0, sleepMinutesRawSum - DAILY_BREAK_MINUTES);

        records.push({
          dateStr: dateKey,
          user: userName,
          role: userObj.role,
          firstLogin,
          lastLogout: isCurrentlyActive ? null : lastLogout,
          totalHours,
          activeHours: activeMinutesSum / 60,
          sleepHours: sleepMinutesReal / 60,
          hasAbnormal,
          isCurrentlyActive,
          sessionsCount: dayPairings.length
        });
      });
    });

    // Filter by date range
    return records.filter(rec => {
      const dateVal = rec.dateStr;
      const passFrom = fromDate ? dateVal >= fromDate : true;
      const passTo = toDate ? dateVal <= toDate : true;
      return passFrom && passTo;
    }).sort((a, b) => b.dateStr.localeCompare(a.dateStr) || a.user.localeCompare(b.user));
  };

  const filteredRecords = getAttendanceRecords();

  // Compute Aggregates
  const totalHoursWorked = filteredRecords.reduce((sum, r) => sum + r.totalHours, 0);
  const abnormalDaysCount = filteredRecords.filter(r => r.hasAbnormal).length;
  const activeSessionsCount = users.filter(u => getUserLiveStatus(u.name).status === 'Logged In').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-900/25 border border-neutral-850 p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-white uppercase tracking-wider font-mono">Work-Hours & Attendance Tracker</h2>
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Real-time Cairo timezone (Africa/Cairo) attendance monitor, shift logs, and automatic abnormal logout tracking.
          </p>
        </div>

        <button 
          onClick={fetchData} 
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-neutral-950 hover:bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-400' : ''}`} />
          <span>Reload Logs</span>
        </button>
      </div>

      {/* Aggregate metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Metric 1 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Tracked Personnel Active Status</p>
            <p className="text-2xl font-extrabold text-white font-mono flex items-baseline gap-1.5">
              {activeSessionsCount} <span className="text-xs text-neutral-500 font-medium font-sans">currently working</span>
            </p>
            <p className="text-[10px] text-neutral-400 flex items-center space-x-1">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Real-time active Moderator or Call Center sessions</span>
            </p>
          </div>
          <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        {/* Metric 2 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Accumulated Period Work-Hours</p>
            <p className="text-2xl font-extrabold text-emerald-400 font-mono">
              {totalHoursWorked.toFixed(2)} <span className="text-xs text-neutral-500 font-medium font-sans">hours</span>
            </p>
            <p className="text-[10px] text-neutral-400">
              Excludes abnormal/auto-closed login sessions completely
            </p>
          </div>
          <div className="p-3.5 bg-neutral-950 text-emerald-400 rounded-2xl border border-neutral-850">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3 */}
        <div className="glass-panel p-5 rounded-2xl flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <p className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Abnormal Session Flags</p>
            <p className="text-2xl font-extrabold text-amber-500 font-mono">
              {abnormalDaysCount} <span className="text-xs text-neutral-500 font-medium font-sans">abnormal end(s)</span>
            </p>
            <p className="text-[10px] text-neutral-400">
              Sessions closed automatically on abnormal logout/login cycle
            </p>
          </div>
          <div className="p-3.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left column: Live roster list and filters */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Filters card */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center space-x-2.5 pb-3 border-b border-neutral-850">
              <Filter className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Date Interval Filter</h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">From Date</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">To Date</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="text-[10px] text-neutral-500 flex items-start space-x-1.5 font-medium bg-neutral-950/40 p-3 rounded-lg border border-neutral-850/60">
                <Clock className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Midnight boundaries and active login sessions are mapped natively according to Cairo Standard Time (Africa/Cairo) to assure absolute regional payroll reporting accuracy.
                </p>
              </div>
            </div>
          </div>

          {/* Personnel list with live indicators */}
          <div className="glass-panel p-6 rounded-2xl shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-850">
              <div className="flex items-center space-x-2.5">
                <User className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Personnel Status</h3>
              </div>
              <span className="text-[9px] bg-neutral-950 text-neutral-400 px-2 py-0.5 rounded font-bold font-mono">
                {users.length} Active
              </span>
            </div>

            <div className="divide-y divide-neutral-850/50 space-y-1">
              {users.map((item) => {
                const live = getUserLiveStatus(item.name);
                const isOnline = live.status === 'Logged In';
                
                // Get summary of hours in the period specifically for this user
                const userDays = filteredRecords.filter(r => r.user === item.name);
                const userHours = userDays.reduce((sum, d) => sum + d.totalHours, 0);

                return (
                  <div key={item.pin} className="py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className={`w-8 h-8 rounded-full ${item.avatarColor} text-white flex items-center justify-center font-bold font-mono text-xs relative flex-shrink-0 shadow-md`}>
                        {item.name.slice(0, 2)}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-neutral-950 ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-neutral-600'}`} />
                      </div>
                      <div className="text-left min-w-0">
                        <p className="text-xs font-extrabold text-white truncate">{item.name}</p>
                        <p className="text-[10px] font-bold text-neutral-500 font-mono">{item.role}</p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0 font-mono">
                      <p className="text-xs font-extrabold text-neutral-200">{userHours.toFixed(1)} hrs</p>
                      <p className="text-[9px] text-neutral-500 font-medium">Period Total</p>
                    </div>
                  </div>
                );
              })}
              {users.length === 0 && (
                <p className="text-center text-xs text-neutral-500 py-4">No active personnel registered for tracking.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right column: Daily ledger records */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden border border-neutral-800 flex flex-col min-h-[500px]">
            
            {/* Header tab/bar */}
            <div className="px-6 py-4 border-b border-neutral-800 bg-neutral-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">Daily Attendance Records</h3>
              </div>
              <span className="text-[10px] text-neutral-400 font-mono font-semibold">
                Showing {filteredRecords.length} records
              </span>
            </div>

            {/* Scrollable grid table */}
            <div className="overflow-y-auto max-h-[600px] divide-y divide-neutral-850">
              
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20 space-y-3">
                  <RefreshCw className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs text-neutral-500 font-medium">Processing chronological shift records...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center px-4 space-y-3">
                  <Clock className="w-10 h-10 text-neutral-700" />
                  <div>
                    <p className="text-xs font-bold text-neutral-400">No shift records found</p>
                    <p className="text-[10px] text-neutral-500 mt-1 max-w-sm mx-auto leading-relaxed">
                      No Login or Logout attendance logs were registered for tracked roles within the selected date interval ({fromDate} to {toDate}).
                    </p>
                  </div>
                </div>
              ) : (
                filteredRecords.map((rec) => {
                  return (
                    <div 
                      key={`${rec.user}-${rec.dateStr}`} 
                      className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:bg-neutral-900/10 ${
                        rec.hasAbnormal ? 'border-l-4 border-amber-500' : 'border-l-4 border-emerald-500'
                      }`}
                    >
                      {/* Left: Day & User */}
                      <div className="space-y-1 text-left min-w-0">
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                          <span className="text-xs font-bold text-white font-mono">
                            {formatCairoDateString(rec.dateStr)}
                          </span>
                          
                          {rec.isCurrentlyActive ? (
                            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-wider animate-pulse flex items-center space-x-1">
                              <span className="w-1 h-1 bg-emerald-400 rounded-full animate-ping" />
                              <span>Active Now</span>
                            </span>
                          ) : null}

                          {rec.hasAbnormal ? (
                            <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[8px] font-bold font-mono uppercase tracking-wider flex items-center space-x-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              <span>Abnormal end</span>
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center space-x-2 text-neutral-400">
                          <span className="text-xs font-extrabold text-neutral-200">{rec.user}</span>
                          <span className="text-neutral-600 text-[10px]">•</span>
                          <span className="text-[10px] text-neutral-500 font-mono font-semibold">{rec.role}</span>
                          <span className="text-neutral-600 text-[10px]">•</span>
                          <span className="text-[10px] text-neutral-500">{rec.sessionsCount} session{rec.sessionsCount !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      {/* Right: Timeline and hours worked */}
                      <div className="flex flex-col sm:items-end gap-1 flex-shrink-0">
                        <div className="flex items-center space-x-2 font-mono text-[10px] text-neutral-400">
                          <div className="bg-neutral-950 px-2 py-1 rounded border border-neutral-850 text-center min-w-[70px]">
                            <p className="text-[8px] text-neutral-500 uppercase font-bold leading-tight">First In</p>
                            <p className="font-bold text-neutral-200">{rec.firstLogin ? formatCairoTime(rec.firstLogin) : '--:--'}</p>
                          </div>
                          <ArrowRight className="w-3.5 h-3.5 text-neutral-600" />
                          <div className="bg-neutral-950 px-2 py-1 rounded border border-neutral-850 text-center min-w-[70px]">
                            <p className="text-[8px] text-neutral-500 uppercase font-bold leading-tight">Last Out</p>
                            <p className="font-bold text-neutral-200">
                              {rec.isCurrentlyActive ? 'Active' : (rec.lastLogout ? formatCairoTime(rec.lastLogout) : '--:--')}
                            </p>
                          </div>
                        </div>

                        {/* Hours tag */}
                        <div className="text-left sm:text-right mt-1.5 font-mono">
                          {rec.hasAbnormal ? (
                            <p className="text-xs font-bold text-amber-400 flex items-center sm:justify-end gap-1">
                              <span>0.00 hrs</span>
                              <span className="text-[9px] text-neutral-500 font-sans font-medium">(Excluded)</span>
                            </p>
                          ) : (
                            <>
                              <p className="text-xs font-bold text-emerald-400">
                                {rec.totalHours.toFixed(2)} hrs <span className="text-neutral-500 font-sans font-medium">total shift</span>
                              </p>
                              <div className="flex items-center gap-2 justify-end mt-0.5">
                                <span className="text-[10px] font-bold text-sky-400">{rec.activeHours.toFixed(2)}h active</span>
                                <span className="text-neutral-700">•</span>
                                <span className="text-[10px] font-bold text-neutral-500">{rec.sleepHours.toFixed(2)}h sleep</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

            </div>

            {/* Help guidelines banner */}
            <div className="p-4 sm:p-5 bg-neutral-950/30 border-t border-neutral-850/80 text-[10px] text-neutral-400 leading-relaxed space-y-1.5">
              <p className="font-bold text-neutral-300 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>Abnormal End Session Criteria:</span>
              </p>
              <p>
                An abnormal end occurs if a tracked user leaves their session prematurely (e.g. browser crash, tab closure, or network loss) and subsequently attempts to start a new Login. The system automatically detects this unmatched login, creates an retroactive Auto-Closed Logout entry, and safely excludes that entire damaged shift's hours from calculated period payroll totals to prevent payroll over-estimations.
              </p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
