import React, { useState, useEffect } from 'react';
import { SystemUser, UserRole, TeamMessage } from './types';
import LoginScreen from './components/LoginScreen';
import LeadIntake from './components/LeadIntake';
import MonitorDashboard from './components/MonitorDashboard';
import CallCenter from './components/CallCenter';
import OrganizerDashboard from './components/OrganizerDashboard';
import AttendanceReport from './components/AttendanceReport';
import BookingWorkspace from './components/BookingWorkspace';
import { DatabaseService } from './services/db';
import { Eye, ChartPie, Phone, Settings, LogOut, User, Activity, Clock, ShieldAlert, BadgeInfo, Copy, Check, ExternalLink, Bell, Mail, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type PageType = 'intake' | 'monitor' | 'callcenter' | 'organizer' | 'attendance' | 'bookings';

export default function App() {
  const [user, setUser] = useState<SystemUser | null>(null);
  const [activePage, setActivePage] = useState<PageType>('intake');
  const [systemTime, setSystemTime] = useState<string>('');
  const [dbError, setDbError] = useState<string | null>(null);
  const [showSetupModal, setShowSetupModal] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Notification States
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);

  const loadMessages = async () => {
    if (!localStorage.getItem('eyeworld_session')) return;
    const msgs = await DatabaseService.getMessages();
    setMessages(msgs);
  };

  useEffect(() => {
    if (!user) {
      setMessages([]);
      return;
    }
    loadMessages();
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const getUnreadMessages = () => {
    if (!user) return [];
    const recipientMap: Record<UserRole, ('Moderators' | 'Team Leaders' | 'Call Center' | 'All')[]> = {
      'Admin': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
      'Organizer': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
      'Team Leader': ['All', 'Team Leaders'],
      'Call Center': ['All', 'Call Center'],
      'Moderator': ['All', 'Moderators'],
      'Doctor': ['All'],
    };
    const allowedRoles = recipientMap[user.role] || ['All'];
    return messages.filter(msg => allowedRoles.includes(msg.recipientRole) && !msg.readBy.includes(user.name));
  };

  const getMyMessages = () => {
    if (!user) return [];
    const recipientMap: Record<UserRole, ('Moderators' | 'Team Leaders' | 'Call Center' | 'All')[]> = {
      'Admin': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
      'Organizer': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
      'Team Leader': ['All', 'Team Leaders'],
      'Call Center': ['All', 'Call Center'],
      'Moderator': ['All', 'Moderators'],
      'Doctor': ['All'],
    };
    const allowedRoles = recipientMap[user.role] || ['All'];
    return messages.filter(msg => allowedRoles.includes(msg.recipientRole));
  };

  const handleMarkAsRead = async () => {
    if (!user) return;
    await DatabaseService.markMessagesAsRead(user.role, user.name);
    await loadMessages();
  };

  // Read session from localStorage on mount
  useEffect(() => {
    // Subscribe to DB error
    const unsubscribe = DatabaseService.subscribeToError((err) => {
      setDbError(err);
    });

    const savedUser = localStorage.getItem('eyeworld_session');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as SystemUser;
        setUser(parsed);
        // Default page based on role on entry
        setDefaultPageForRole(parsed.role);
        // The saved session skips LoginScreen entirely, so make sure today's
        // attendance still gets recorded even on a restored session.
        DatabaseService.ensureDailyAttendance(parsed.name, parsed.role);
      } catch (e) {
        localStorage.removeItem('eyeworld_session');
      }
    }

    // Dynamic system clock
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => {
      clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const setDefaultPageForRole = (role: UserRole) => {
    if (role === 'Admin' || role === 'Organizer') {
      setActivePage('organizer');
    } else if (role === 'Team Leader') {
      setActivePage('callcenter');
    } else if (role === 'Call Center') {
      setActivePage('callcenter');
    } else if (role === 'Moderator') {
      setActivePage('intake');
    } else if (role === 'Doctor') {
      setActivePage('bookings');
    }
  };

  const handleLoginSuccess = async (loggedInUser: SystemUser) => {
    setUser(loggedInUser);
    localStorage.setItem('eyeworld_session', JSON.stringify(loggedInUser));
    setDefaultPageForRole(loggedInUser.role);
    await DatabaseService.recordLogin(loggedInUser.name, loggedInUser.role);
  };

  const handleLogout = async () => {
    if (user) {
      await DatabaseService.recordLogout(user.name, user.role);
    }
    setUser(null);
    localStorage.removeItem('eyeworld_session');
  };

  const handleCopySQL = () => {
    navigator.clipboard.writeText(SUPABASE_SETUP_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderSetupModal = () => (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Supabase SQL Schema Setup Assistant</h3>
          </div>
          <button 
            onClick={() => setShowSetupModal(false)}
            className="text-neutral-400 hover:text-white hover:bg-neutral-800 p-1.5 rounded-lg transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-300 leading-relaxed">
          <div className="bg-neutral-950 border border-neutral-850 rounded-xl p-4 space-y-2">
            <p className="font-semibold text-white">Why are you seeing this?</p>
            <p>
              The application detected a connection to your Supabase project, but it returned a query error because the required tables (<code className="bg-neutral-950/60 text-emerald-400 px-1 py-0.5 rounded border border-neutral-850">system_users</code>, <code className="bg-neutral-950/60 text-emerald-400 px-1 py-0.5 rounded border border-neutral-850">leads</code>, etc.) do not exist or are protected by Row Level Security (RLS) rules.
            </p>
            <p className="text-neutral-400">
              The CRM is temporarily running with its robust client-side Local Storage fallback, so you can still use the system normally. However, to synchronize and persist data globally, you must set up the database tables in your Supabase dashboard.
            </p>
          </div>

          <div className="space-y-3">
            <p className="font-semibold text-neutral-200 uppercase tracking-wide font-mono text-[10px]">Follow these 3 easy steps:</p>
            <ol className="list-decimal pl-4 space-y-2 text-neutral-400">
              <li>
                <strong className="text-white">Copy the SQL Script</strong> below by clicking the "Copy SQL Schema" button.
              </li>
              <li>
                Go to your <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline inline-flex items-center space-x-1 font-bold">Supabase Dashboard <ExternalLink className="w-3 h-3 ml-0.5" /></a>, select your project, click on the <strong className="text-white">SQL Editor</strong> tab in the sidebar, and click <strong className="text-white">New Query</strong>.
              </li>
              <li>
                Paste the SQL script into the query editor, click <strong className="text-white">Run</strong>, and then reload this website!
              </li>
            </ol>
          </div>

          {/* SQL Editor Code Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-neutral-500 font-mono">SUPABASE_SCHEMA.SQL</span>
              <button
                onClick={handleCopySQL}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  copied 
                    ? 'bg-emerald-500/25 text-emerald-400 border border-emerald-500/40' 
                    : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                }`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
              </button>
            </div>
            <pre className="bg-neutral-950 border border-neutral-850 p-4 rounded-xl font-mono text-[10px] text-emerald-500 overflow-x-auto max-h-60 leading-normal select-all">
              {SUPABASE_SETUP_SQL}
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-neutral-850 flex items-center justify-end bg-neutral-950/40">
          <button
            onClick={() => setShowSetupModal(false)}
            className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-250 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Close Setup Assistant
          </button>
        </div>
      </div>
    </div>
  );

  if (!user) {
    return (
      <>
        <LoginScreen 
          onLoginSuccess={handleLoginSuccess} 
          dbError={dbError}
          onShowSetupHelp={() => setShowSetupModal(true)}
        />
        {showSetupModal && renderSetupModal()}
      </>
    );
  }

  // Permissions helper
  const hasAccess = (page: PageType): boolean => {
    switch (page) {
      case 'intake':
        return ['Admin', 'Organizer', 'Moderator'].includes(user.role);
      case 'monitor':
        return ['Admin', 'Organizer'].includes(user.role);
      case 'callcenter':
        return ['Admin', 'Team Leader', 'Call Center'].includes(user.role);
      case 'organizer':
        return ['Admin', 'Organizer'].includes(user.role);
      case 'attendance':
        return ['Admin', 'Team Leader', 'Organizer'].includes(user.role);
      case 'bookings':
        return ['Admin', 'Organizer', 'Team Leader', 'Call Center', 'Moderator', 'Doctor'].includes(user.role);
      default:
        return false;
    }
  };

  // Sidebar navigation menu items
  const menuItems = [
    { id: 'organizer', label: 'Organizer', icon: Settings, page: 'organizer' as PageType },
    { id: 'monitor', label: 'Live Monitor', icon: ChartPie, page: 'monitor' as PageType },
    { id: 'attendance', label: 'Attendance', icon: Clock, page: 'attendance' as PageType },
    { id: 'callcenter', label: 'Call Center', icon: Phone, page: 'callcenter' as PageType },
    { id: 'intake', label: 'Lead Intake', icon: Eye, page: 'intake' as PageType },
    { id: 'bookings', label: 'Appointments', icon: Calendar, page: 'bookings' as PageType },
  ];

  const allowedMenuItems = menuItems.filter(item => hasAccess(item.page));

  return (
    <div className="min-h-screen bg-[#050505] text-[#e5e5e5] flex flex-col antialiased">
      {/* Top Clinic Status / Privileges Ribbon */}
      <div className="bg-neutral-950 text-neutral-400 px-4 py-2 text-xs flex items-center justify-between font-mono border-b border-neutral-900">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="font-semibold text-neutral-200">Eye World Clinic Network</span>
          </span>
          <span className="hidden sm:inline text-neutral-600 border-l border-neutral-900 pl-3">Role Status: Authorized</span>
          
          {dbError && (
            <button 
              onClick={() => setShowSetupModal(true)}
              className="ml-3 flex items-center space-x-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2 py-0.5 rounded text-[10px] hover:bg-amber-500/20 transition-all cursor-pointer animate-pulse font-sans font-bold"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
              <span>Supabase Schema Missing (Click to Setup)</span>
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5 text-neutral-400">
            <Clock className="w-3.5 h-3.5 text-emerald-400" />
            <span>{systemTime}</span>
          </div>
          <span className="text-neutral-500 hidden sm:inline">2026-07-19</span>
        </div>
      </div>

      {/* Main Header navigation and content */}
      <header className="bg-neutral-900/60 border-b border-neutral-800 sticky top-0 z-40 shadow-lg backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 p-2 rounded-xl">
                <Eye className="w-5 h-5" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-tight text-white font-sans block leading-tight">Eye World Clinic</span>
                <span className="text-[10px] text-neutral-500 font-mono font-bold uppercase tracking-[0.15em] block">Lead Operations</span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="hidden md:flex space-x-1">
              {allowedMenuItems.map((item) => {
                const Icon = item.icon;
                const isCurrent = activePage === item.page;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActivePage(item.page)}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                      isCurrent 
                        ? 'bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-sm' 
                        : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white border border-transparent'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Profile HUD & Logout */}
            <div className="flex items-center space-x-4 relative">
              
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications);
                    if (!showNotifications) {
                      loadMessages();
                    }
                  }}
                  className={`p-2.5 rounded-xl transition-all border cursor-pointer relative ${
                    showNotifications 
                      ? 'bg-emerald-600/15 text-emerald-400 border-emerald-500/30' 
                      : 'bg-neutral-900 text-neutral-400 hover:text-white border-neutral-800'
                  }`}
                  title="Team Guidelines Notifications"
                >
                  <Bell className="w-4 h-4" />
                  {getUnreadMessages().length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                  )}
                  {getUnreadMessages().length > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full" />
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl z-50 overflow-hidden font-sans"
                    >
                      <div className="p-4 border-b border-neutral-850 flex items-center justify-between bg-neutral-950/40">
                        <div>
                          <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Team Guidelines Updates</h4>
                          <p className="text-[10px] text-neutral-500 font-medium">Broadcasts flagged for your role ({user.role})</p>
                        </div>
                        {getUnreadMessages().length > 0 && (
                          <button
                            onClick={handleMarkAsRead}
                            className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold underline cursor-pointer"
                          >
                            Mark read
                          </button>
                        )}
                      </div>

                      <div className="max-h-60 overflow-y-auto divide-y divide-neutral-850">
                        {getMyMessages().length === 0 ? (
                          <div className="p-6 text-center text-xs text-neutral-500">
                            <Mail className="w-8 h-8 text-neutral-700 mx-auto mb-2" />
                            <p>No guidelines messages found</p>
                          </div>
                        ) : (
                          [...getMyMessages()].map((msg) => {
                            const isUnread = !msg.readBy.includes(user.name);
                            return (
                              <div 
                                key={msg.id} 
                                className={`p-3.5 transition-all text-xs space-y-1.5 text-left relative ${
                                  isUnread ? 'bg-emerald-500/5' : 'hover:bg-neutral-950/40'
                                }`}
                              >
                                {isUnread && (
                                  <span className="absolute top-3.5 right-3 w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                )}
                                <div className="flex items-center justify-between">
                                  <span className="font-bold text-neutral-200">{msg.senderName} ({msg.senderRole})</span>
                                  <span className="text-[9px] text-neutral-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                                <p className="text-neutral-400 leading-relaxed font-medium">{msg.content}</p>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center space-x-3 border-l border-neutral-800 pl-4 py-1">
                <div className={`w-8 h-8 rounded-full ${user.avatarColor} text-white flex items-center justify-center font-bold font-mono text-xs shadow-md`}>
                  {user.name.slice(0, 2)}
                </div>
                <div className="hidden sm:block text-left min-w-0">
                  <p className="text-xs font-extrabold text-white leading-tight truncate">{user.name}</p>
                  <p className="text-[10px] font-bold text-neutral-500 font-mono tracking-wide">{user.role}</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="p-2.5 hover:bg-rose-950/20 text-neutral-400 hover:text-rose-400 rounded-xl transition-all border border-neutral-800 hover:border-rose-900/30 cursor-pointer"
                title="Log Out Session"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation tab-bar */}
      <div className="md:hidden bg-neutral-900/80 border-b border-neutral-800 py-2.5 px-4 flex justify-around sticky top-16 z-30 shadow-md backdrop-blur-md">
        {allowedMenuItems.map((item) => {
          const Icon = item.icon;
          const isCurrent = activePage === item.page;
          return (
            <button
              key={item.id}
              onClick={() => setActivePage(item.page)}
              className={`flex flex-col items-center space-y-1 p-2 rounded-xl transition-all ${
                isCurrent ? 'text-emerald-400 bg-emerald-600/5 px-3 py-1 border border-emerald-500/10' : 'text-neutral-500 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-bold leading-none">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
          >
            {activePage === 'intake' && hasAccess('intake') && <LeadIntake currentUser={user} />}
            {activePage === 'monitor' && hasAccess('monitor') && <MonitorDashboard />}
            {activePage === 'callcenter' && hasAccess('callcenter') && <CallCenter currentUser={user} />}
            {activePage === 'organizer' && hasAccess('organizer') && <OrganizerDashboard currentUser={user} />}
            {activePage === 'attendance' && hasAccess('attendance') && <AttendanceReport />}
            {activePage === 'bookings' && hasAccess('bookings') && <BookingWorkspace currentUser={user} />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Footer System HUD */}
      <footer className="bg-neutral-950/40 border-t border-neutral-900 py-6 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between text-[11px] text-neutral-500 font-medium space-y-3 md:space-y-0">
          <p>© 2026 Eye World Eye Clinic Network. All rights reserved.</p>
          
          <div className="flex items-center space-x-1 bg-neutral-900/40 px-3 py-1.5 rounded-lg border border-neutral-800/80 text-neutral-400">
            <BadgeInfo className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            {dbError ? (
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowSetupModal(true)}>
                <span className="font-semibold block sm:inline mr-2 text-amber-500">Database Error:</span>
                <span className="truncate">{dbError}</span> (Click here for SQL setup)
              </div>
            ) : (
              <span>Supabase CRM Database is active. All data reads and writes persist immediately and directly to the secure Supabase cloud store.</span>
            )}
          </div>
        </div>
      </footer>

      {/* Setup Modal Overlay */}
      {showSetupModal && renderSetupModal()}
    </div>
  );
}

const SUPABASE_SETUP_SQL = `-- SQL Script to set up Eye World CRM Database Tables in Supabase
-- Go to your Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run!

-- 1. Create system_users table
CREATE TABLE IF NOT EXISTS system_users (
  pin TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  "avatarColor" TEXT NOT NULL
);

-- 2. Create leads table
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL UNIQUE,
  entity TEXT NOT NULL,
  platform TEXT NOT NULL,
  priority TEXT NOT NULL,
  status TEXT NOT NULL,
  "inquiryNote" TEXT,
  "addedBy" TEXT NOT NULL,
  "assignedAgent" TEXT NOT NULL,
  "followUpDue" TEXT,
  "callCenterNote" TEXT,
  "organizerNote" TEXT,
  "organizerNoteUpdatedAt" TEXT,
  "createdAt" TEXT NOT NULL,
  "updatedAt" TEXT NOT NULL,
  "isBookedForAppointment" BOOLEAN NOT NULL,
  "commissionEligible" BOOLEAN NOT NULL DEFAULT FALSE,
  "attendanceStatus" TEXT NOT NULL DEFAULT 'Pending',
  "statusHistory" JSONB NOT NULL,
  "callLogs" JSONB NOT NULL
);

-- 3. Create team_messages table
CREATE TABLE IF NOT EXISTS team_messages (
  id TEXT PRIMARY KEY,
  "senderName" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "recipientRole" TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL,
  "readBy" JSONB NOT NULL,
  "threadId" TEXT,
  "expiresAt" TEXT NOT NULL
);

-- 4. Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  timestamp TEXT NOT NULL,
  "user" TEXT NOT NULL,
  role TEXT NOT NULL,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL
);

-- 5. Seed initial system users (if not exists)
INSERT INTO system_users (pin, name, role, "avatarColor") VALUES
('1811', 'Hamdi', 'Admin', 'bg-rose-600'),
('1010', 'Weddan', 'Organizer', 'bg-amber-500'),
('1234', 'Hanaa', 'Team Leader', 'bg-purple-600'),
('0001', 'Omar', 'Call Center', 'bg-blue-600'),
('0002', 'Eman', 'Call Center', 'bg-teal-600'),
('1111', 'Amal', 'Moderator', 'bg-emerald-600'),
('2222', 'Menna', 'Moderator', 'bg-indigo-600')
ON CONFLICT (pin) DO NOTHING;

-- 6. Enable Row Level Security (RLS) on all tables and create permissive anon policies
-- Gated by custom application PIN controls rather than database-level identity.
ALTER TABLE system_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON system_users FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON leads FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE team_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON team_messages FOR ALL TO anon USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON audit_logs FOR ALL TO anon USING (true) WITH CHECK (true);`;
