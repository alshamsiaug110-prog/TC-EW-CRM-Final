import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { BookingRequestEvent, Lead, LeadStatus, LeadPriority, SystemUser, SYSTEM_USERS } from '../types';
import { Phone, Search, Filter, ShieldCheck, User, Calendar, BookOpen, MessageSquareCode, Clock, RefreshCw, Send, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CallCenterProps {
  currentUser: SystemUser;
  onLeadUpdated?: () => void;
  onRequestBooking?: (lead: Lead) => void;
}

export default function CallCenter({ currentUser, onLeadUpdated, onRequestBooking }: CallCenterProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [agents, setAgents] = useState<SystemUser[]>(SYSTEM_USERS);
  const [bookingEvents, setBookingEvents] = useState<BookingRequestEvent[]>([]);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [assignmentFilter, setAssignmentFilter] = useState<string>(
    currentUser.role === 'Call Center' ? 'My Assigned' : 'All'
  );

  // Operator Action Forms State
  const [statusInput, setStatusInput] = useState<LeadStatus>('Pending Call Center');
  const [callNoteInput, setCallNoteInput] = useState('');
  const [followUpDateInput, setFollowUpDateInput] = useState('');
  const [agentAssignmentInput, setAgentAssignmentInput] = useState('Unassigned');

  // Feedback State
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Sync state with database
  const refreshLeads = async (newSelectedId?: string) => {
    const fresh = await DatabaseService.getLeads();
    setLeads(fresh);
    if (newSelectedId) {
      const found = fresh.find(l => l.id === newSelectedId);
      if (found) setSelectedLead(found);
    } else if (selectedLead) {
      const found = fresh.find(l => l.id === selectedLead.id);
      setSelectedLead(found || fresh[0] || null);
    } else {
      setSelectedLead(fresh[0] || null);
    }
    if (onLeadUpdated) onLeadUpdated();
  };

  React.useEffect(() => {
    refreshLeads();
    DatabaseService.getUsers().then(setAgents).catch(console.error);
  }, []);

  React.useEffect(() => {
    if (!selectedLead) { setBookingEvents([]); return; }
    DatabaseService.getBookingRequestEvents(selectedLead.id).then(setBookingEvents).catch(console.error);
    const timer = window.setInterval(() => DatabaseService.getBookingRequestEvents(selectedLead.id).then(setBookingEvents).catch(console.error), 10000);
    return () => window.clearInterval(timer);
  }, [selectedLead?.id]);

  // Set action forms when lead selection changes
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setStatusInput(lead.status);
    setCallNoteInput('');
    setFollowUpDateInput(lead.followUpDue || '');
    setAgentAssignmentInput(lead.assignedAgent);
    setSuccessMsg(null);
  };

  // Apply updates
  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const updates: Partial<Lead> = {
      status: statusInput,
      callCenterNote: callNoteInput.trim() ? callNoteInput.trim() : selectedLead.callCenterNote,
      followUpDue: followUpDateInput ? followUpDateInput : null,
      assignedAgent: agentAssignmentInput,
    };

    const res = await DatabaseService.updateLead(selectedLead.id, updates, currentUser);
    
    if (res.success) {
      setSuccessMsg('Call logs saved and status updated successfully!');
      await refreshLeads(selectedLead.id);
      setCallNoteInput('');
      setTimeout(() => setSuccessMsg(null), 3500);
    }
  };

  const handleSelfClaim = async () => {
    if (!selectedLead) return;
    const res = await DatabaseService.updateLead(
      selectedLead.id, 
      { assignedAgent: currentUser.name }, 
      currentUser
    );
    if (res.success) {
      setSuccessMsg(`Successfully claimed lead: ${selectedLead.name}!`);
      await refreshLeads(selectedLead.id);
      setAgentAssignmentInput(currentUser.name);
    }
  };

  // Filtering Logic
  const filteredLeads = leads.filter(lead => {
    // Search query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      lead.name.toLowerCase().includes(query) || 
      lead.phone.includes(query);

    // Status filter
    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;

    // Priority filter
    const matchesPriority = priorityFilter === 'All' || lead.priority === priorityFilter;

    // Assignment filter
    let matchesAssignment = true;
    if (assignmentFilter === 'My Assigned') {
      matchesAssignment = lead.assignedAgent === currentUser.name;
    } else if (assignmentFilter === 'Unassigned') {
      matchesAssignment = lead.assignedAgent === 'Unassigned';
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesAssignment;
  });

  // Call Center Agents list for assign select
  const callCenterAgents = agents.filter(u => u.role === 'Call Center');

  // Colors mapping for statuses
  const statusColors: Record<LeadStatus, { bg: string; text: string; dot: string }> = {
    'Pending Call Center': { bg: 'bg-indigo-500/10', text: 'text-indigo-400', dot: 'bg-indigo-500' },
    'Under Follow-Up': { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-500' },
    'Booked/Confirmed': { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-500' },
    'Canceled': { bg: 'bg-rose-500/10', text: 'text-rose-400', dot: 'bg-rose-500' },
    'Re-engage Lead': { bg: 'bg-purple-500/10', text: 'text-purple-400', dot: 'bg-purple-500' },
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <Phone className="w-8 h-8 text-emerald-400" />
            <span>Call Center Console</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400 font-medium">
            Authorized Agent: <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-mono text-xs">{currentUser.name} ({currentUser.role})</span>
          </p>
        </div>
        
        <button
          onClick={() => refreshLeads()}
          className="flex items-center space-x-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Records</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left column: Leads Directory */}
        <div className="glass-panel shadow-xl overflow-hidden flex flex-col h-[650px] rounded-2xl">
          {/* Header & Controls */}
          <div className="p-4 border-b border-neutral-800/80 space-y-3 bg-neutral-950/40">
            {/* Search */}
            <div className="relative">
              <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient name, phone..."
                className="block w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-xs font-medium text-white shadow-md placeholder:text-neutral-600"
              />
            </div>

            {/* Quick Filter Controls */}
            <div className="space-y-2">
              <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-lg text-[10px] font-bold text-neutral-400">
                {currentUser.role === 'Call Center' && (
                  <button
                    onClick={() => setAssignmentFilter('My Assigned')}
                    className={`flex-1 text-center py-1.5 rounded transition-all cursor-pointer ${
                      assignmentFilter === 'My Assigned' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                    }`}
                  >
                    My Leads
                  </button>
                )}
                <button
                  onClick={() => setAssignmentFilter('All')}
                  className={`flex-1 text-center py-1.5 rounded transition-all cursor-pointer ${
                    assignmentFilter === 'All' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  All Leads
                </button>
                <button
                  onClick={() => setAssignmentFilter('Unassigned')}
                  className={`flex-1 text-center py-1.5 rounded transition-all cursor-pointer ${
                    assignmentFilter === 'Unassigned' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
                  }`}
                >
                  Unassigned
                </button>
              </div>

              {/* Status / Priority dropdown filters */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Pending Call Center">Pending CC</option>
                  <option value="Under Follow-Up">Under Follow-Up</option>
                  <option value="Booked/Confirmed">Booked</option>
                  <option value="Canceled">Canceled</option>
                  <option value="Re-engage Lead">Re-engage</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-1.5 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="All">All Priorities</option>
                  <option value="Hot">Hot Priority</option>
                  <option value="Warm">Warm Priority</option>
                  <option value="Cold">Cold Priority</option>
                </select>
              </div>
            </div>
          </div>

          {/* Directory Listings */}
          <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
            {filteredLeads.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 space-y-2 mt-12">
                <Filter className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-xs font-semibold">No matches found</p>
                <p className="text-[10px] text-neutral-600">Adjust your queries or active filter selection</p>
              </div>
            ) : (
              filteredLeads.map((lead) => {
                const isSelected = selectedLead?.id === lead.id;
                const colors = statusColors[lead.status] || statusColors['Pending Call Center'];
                const hasFollowUpToday = lead.followUpDue === new Date().toISOString().split('T')[0];

                return (
                  <button
                    key={lead.id}
                    onClick={() => handleSelectLead(lead)}
                    className={`w-full text-left p-4 hover:bg-neutral-900/30 transition-colors duration-150 flex flex-col space-y-2 focus:outline-none border-l-4 cursor-pointer ${
                      isSelected ? 'bg-emerald-500/5 border-emerald-500' : 'border-transparent'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white text-xs truncate max-w-[150px]">{lead.name}</span>
                      <span className={`px-2 py-0.5 rounded font-bold text-[9px] ${colors.bg} ${colors.text}`}>
                        {lead.status === 'Pending Call Center' ? 'Pending' : lead.status}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                      <span>{lead.phone}</span>
                      <span className="font-semibold text-neutral-300 bg-neutral-850 border border-neutral-800 px-1 py-0.2 rounded">{lead.entity}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-neutral-500">
                      <span className="truncate">Agent: <span className="font-semibold text-neutral-300">{lead.assignedAgent}</span></span>
                      {lead.followUpDue && (
                        <span className={`font-semibold flex items-center space-x-1 font-mono ${hasFollowUpToday ? 'text-rose-400 font-bold' : ''}`}>
                          <span className="inline-block w-1 h-1 rounded-full bg-rose-500 animate-ping" />
                          <span>F/U: {lead.followUpDue}</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Active Lead Work Console */}
        <div className="lg:col-span-2 space-y-6">
          {selectedLead ? (
            <div className="space-y-6">
              {/* Patient Basic Profile & Original inquiry */}
              <div className="glass-panel rounded-2xl p-6 space-y-6 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-neutral-850 space-y-3 sm:space-y-0">
                  <div className="space-y-1">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider text-white ${
                      selectedLead.priority === 'Hot' ? 'bg-rose-500' :
                      selectedLead.priority === 'Warm' ? 'bg-amber-500' :
                      'bg-neutral-600'
                    }`}>
                      {selectedLead.priority} Priority
                    </span>
                    <h2 className="text-xl font-extrabold text-white tracking-tight">{selectedLead.name}</h2>
                    <p className="text-xs font-mono font-bold text-emerald-400 tracking-wider select-all">{selectedLead.phone}</p>
                  </div>

                  <div className="flex flex-col sm:items-end text-xs space-y-1 text-neutral-400">
                    <span className="font-semibold">Entity: <span className="text-emerald-400 font-bold">{selectedLead.entity}</span></span>
                    <span>Platform: <span className="font-bold text-neutral-300">{selectedLead.platform}</span></span>
                    <span>Registered by: <span className="font-medium text-neutral-300">{selectedLead.addedBy}</span></span>
                  </div>
                </div>

                {/* Original Inquiry Notes */}
                <div className="bg-neutral-950/40 p-4 rounded-xl border border-neutral-850/80 space-y-2">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-neutral-500" />
                    <span>Patient Inquiry Statement</span>
                  </h4>
                  <p className="text-xs text-neutral-300 leading-relaxed font-medium">
                    "{selectedLead.inquiryNote}"
                  </p>
                </div>

                {/* Organizer notes if exist */}
                {selectedLead.organizerNote && (
                  <div className="bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 space-y-1.5">
                    <h4 className="text-xs font-bold text-amber-400 flex items-center space-x-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Organizer weddan's guidelines</span>
                    </h4>
                    <p className="text-xs text-amber-200 leading-relaxed font-semibold">
                      "{selectedLead.organizerNote}"
                    </p>
                  </div>
                )}

                {/* Call Center Note */}
                {selectedLead.callCenterNote && (
                  <div className="bg-blue-500/10 p-4 rounded-xl border border-blue-500/20 space-y-1.5">
                    <h4 className="text-xs font-bold text-blue-400 flex items-center space-x-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>Latest Call Center Note</span>
                    </h4>
                    <p className="text-xs text-blue-200 leading-relaxed font-semibold">
                      "{selectedLead.callCenterNote}"
                    </p>
                  </div>
                )}
              </div>

              {/* Action Form: Log a Call & Update Status */}
              <div className="bg-neutral-900/60 border border-neutral-800 shadow-2xl rounded-2xl p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                  <h3 className="text-base font-bold flex items-center space-x-2 text-white">
                    <Phone className="w-4 h-4 text-emerald-400 animate-pulse" />
                    <span>Operator Action Panel</span>
                  </h3>
                  
                  {selectedLead.assignedAgent === 'Unassigned' && currentUser.role === 'Call Center' && (
                    <button
                      onClick={handleSelfClaim}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 rounded-lg text-xs font-bold flex items-center space-x-1 shadow-md transition-all cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Claim to Me</span>
                    </button>
                  )}
                  {onRequestBooking && <button onClick={() => onRequestBooking(selectedLead)} className="px-3 py-1.5 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg text-xs font-bold flex items-center space-x-1 text-emerald-300"><Calendar className="w-3.5 h-3.5" /><span>طلب للطبيب</span></button>}
                </div>

                <form onSubmit={handleSaveAction} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Select */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Lead Status After Call *</label>
                      <select
                        value={statusInput}
                        onChange={(e) => setStatusInput(e.target.value as LeadStatus)}
                        className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-bold cursor-pointer"
                      >
                        <option value="Pending Call Center">Pending Call Center</option>
                        <option value="Under Follow-Up">Under Follow-Up</option>
                        <option value="Booked/Confirmed">Booked/Confirmed</option>
                        <option value="Canceled">Canceled</option>
                        <option value="Re-engage Lead">Re-engage Lead</option>
                      </select>
                    </div>

                    {/* Follow Up due Date */}
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Next Follow-Up Due Date</label>
                      <div className="relative">
                        <input
                          type="date"
                          value={followUpDateInput}
                          onChange={(e) => setFollowUpDateInput(e.target.value)}
                          className="block w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-bold"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Call Note Input */}
                  <div>
                    <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Call Summary Notes / Contact Logs *</label>
                    <textarea
                      required
                      rows={3}
                      value={callNoteInput}
                      onChange={(e) => setCallNoteInput(e.target.value)}
                      placeholder="Type details of the conversation (e.g., patient is interested but needs to confirm salary date next Sunday; booked diagnostic scan; cold call, etc.)"
                      className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-medium placeholder:text-neutral-700 leading-relaxed"
                    />
                  </div>

                  {/* Agent assignment selector (Only Admin, Organizer, Team Leader) */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-neutral-850 space-y-4 sm:space-y-0">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-neutral-500" />
                      <div>
                        <p className="text-[10px] uppercase font-bold text-neutral-500">Lead Assignment Owner</p>
                        {['Admin', 'Organizer', 'Team Leader'].includes(currentUser.role) ? (
                          <select
                            value={agentAssignmentInput}
                            onChange={(e) => setAgentAssignmentInput(e.target.value)}
                            className="bg-transparent text-xs text-white font-bold border-none focus:outline-none cursor-pointer mt-0.5"
                          >
                            <option value="Unassigned" className="bg-neutral-900">Unassigned</option>
                            {callCenterAgents.map(ag => (
                              <option key={ag.name} value={ag.name} className="bg-neutral-900">{ag.name} (Call Center)</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs text-neutral-300 font-bold">{selectedLead.assignedAgent}</span>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center space-x-3 justify-end">
                      <button
                        type="submit"
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-500/10"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Save Conversation Log</span>
                      </button>
                    </div>
                  </div>
                </form>

                {successMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-lg flex items-center space-x-2 text-emerald-400 text-xs font-semibold"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{successMsg}</span>
                  </motion.div>
                )}
              </div>

              {/* Historical timelines (Previous call notes and status history) */}
              <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl">
                
                {/* Status Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-neutral-850 pb-2">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Status Changes Workflow</span>
                  </h4>
                  {(selectedLead.statusHistory || []).length === 0 ? (
                    <p className="text-neutral-500 text-xs font-medium">No updates recorded.</p>
                  ) : (
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {(selectedLead.statusHistory || []).map((h, i) => (
                        <div key={i} className="text-xs flex flex-col space-y-0.5 border-l-2 border-neutral-800 pl-3.5 relative">
                          <span className="absolute -left-[5px] top-1 w-2 h-2 rounded-full bg-neutral-800 border border-neutral-700" />
                          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                            <span>{new Date(h.changedAt).toLocaleDateString()} {new Date(h.changedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            <span className="font-semibold text-neutral-300">{h.changedBy}</span>
                          </div>
                          <p className="font-bold text-white">{h.status}</p>
                          {h.notes && <p className="text-[10px] text-neutral-400 italic mt-0.5">"{h.notes}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Call Logs History */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-neutral-850 pb-2">
                    <MessageSquareCode className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Contact & Call History logs</span>
                  </h4>
                  {(selectedLead.callLogs || []).length === 0 ? (
                    <div className="p-4 text-center border border-dashed border-neutral-800 rounded-xl text-[10px] text-neutral-500 bg-neutral-950/20">
                      No calls logged yet. Complete the Action Panel above to register your first call log.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                      {(selectedLead.callLogs || []).map((log) => (
                        <div key={log.id} className="text-xs p-2.5 bg-neutral-950/40 border border-neutral-850 rounded-xl space-y-1">
                          <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                            <span className="font-bold text-neutral-300">{log.loggedBy}</span>
                            <span>{new Date(log.loggedAt).toLocaleDateString()}</span>
                          </div>
                          <p className="text-neutral-300 font-medium leading-relaxed">"{log.note}"</p>
                          <div className="flex items-center justify-between text-[9px] text-neutral-500 pt-1.5 border-t border-neutral-850/60">
                            <span>Status: <span className="font-bold text-neutral-400">{log.statusAfterCall}</span></span>
                            {log.followUpDue && <span>F/U Date: <span className="font-bold text-rose-400 font-mono">{log.followUpDue}</span></span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2 space-y-4 border-t border-neutral-850 pt-5">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center space-x-1.5 border-b border-neutral-850 pb-2"><Calendar className="w-3.5 h-3.5 text-emerald-400" /><span>Doctor Request Timeline</span></h4>
                  {bookingEvents.length === 0 ? <p className="text-xs text-neutral-500">لا توجد طلبات أو ردود طبية مرتبطة بهذا المريض حتى الآن.</p> : <div className="space-y-2 max-h-52 overflow-y-auto pr-1">{bookingEvents.map(event => <div key={event.id} className="rounded-xl border border-neutral-800 bg-neutral-950/30 p-3 text-xs"><div className="flex justify-between gap-4 text-[10px] text-neutral-500"><span>{event.actorName} · {event.actorRole}</span><span>{new Date(event.createdAt).toLocaleString()}</span></div><p className="text-emerald-300 font-bold mt-1">{event.eventType}</p><p className="text-neutral-300 mt-1 leading-relaxed">{event.message}</p></div>)}</div>}
                </div>

              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-12 text-center text-neutral-500 space-y-3 mt-12 shadow-xl">
              <Phone className="w-12 h-12 mx-auto text-neutral-700" />
              <p className="font-bold text-white">No leads active</p>
              <p className="text-xs max-w-sm mx-auto text-neutral-500">There are no leads inside the current directories or filtered views. Verify matching phone registrations on the Intake page.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
