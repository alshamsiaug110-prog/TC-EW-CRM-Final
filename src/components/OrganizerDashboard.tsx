import React, { useState } from 'react';
import { DatabaseService } from '../services/db';
import { Lead, LeadStatus, LeadPriority, SystemUser, UserRole, UnconvertedContact } from '../types';
import { 
  ShieldCheck, Search, Filter, MessageSquare, Lock, Eye, CheckCircle2, 
  AlertCircle, Sparkles, RefreshCw, Layers, ShieldAlert, Plus, Trash2, 
  Edit2, Download, Check, UserPlus, X, FileText, Database, Upload, Calendar, UserCheck, Clock,
  MessageSquareCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const getUserPermissions = (role: string): string[] => {
  const perms: string[] = [];
  if (['Admin', 'Organizer', 'Team Leader', 'Moderator'].includes(role)) perms.push('intake');
  if (['Admin', 'Organizer'].includes(role)) perms.push('monitor');
  if (['Admin', 'Organizer', 'Team Leader', 'Call Center'].includes(role)) perms.push('callcenter');
  if (['Admin', 'Organizer'].includes(role)) perms.push('organizer');
  return perms;
};

interface OrganizerDashboardProps {
  currentUser: SystemUser;
  onLeadOptimized?: () => void;
}

export default function OrganizerDashboard({ currentUser, onLeadOptimized }: OrganizerDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [activeTab, setActiveTab] = useState<'leads' | 'booked' | 'reports' | 'users'>('leads');

  // Directory Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');

  // Optimizer notes input
  const [organizerNoteInput, setOrganizerNoteInput] = useState('');
  const [notifyRole, setNotifyRole] = useState<'None' | 'All' | 'Moderators' | 'Team Leaders' | 'Call Center'>('None');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dynamic Team Users CRUD state
  const [teamUsers, setTeamUsers] = useState<SystemUser[]>([]);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [userForm, setUserForm] = useState({ name: '', role: 'Call Center' as UserRole, pin: '', avatarColor: 'bg-blue-600' });
  const [userError, setUserError] = useState<string | null>(null);
  const [userSuccess, setUserSuccess] = useState<string | null>(null);

  // Custom Report Builder States
  const [reportFromDate, setReportFromDate] = useState<string>('');
  const [reportToDate, setReportToDate] = useState<string>('');
  const [includeUnconvertedInReport, setIncludeUnconvertedInReport] = useState(false);
  const [reportUnconvertedData, setReportUnconvertedData] = useState<UnconvertedContact[]>([]);
  
  const ALL_REPORT_COLUMNS = [
    { key: 'ID', label: 'Inquiry ID' },
    { key: 'Name', label: 'Patient Name' },
    { key: 'Phone', label: 'Phone Number' },
    { key: 'Entity', label: 'Clinic/Entity' },
    { key: 'Platform', label: 'Platform/Channel' },
    { key: 'Priority', label: 'Priority' },
    { key: 'Status', label: 'Lead Status' },
    { key: 'Inquiry Note', label: 'Inquiry Note' },
    { key: 'With Booking', label: 'With Booking (Commission)' },
    { key: 'Attendance Status', label: 'Patient Attendance' },
    { key: 'Added By', label: 'Added By' },
    { key: 'Assigned Agent', label: 'Call Center Agent' },
    { key: 'Follow-Up Due', label: 'Follow-Up Date' },
    { key: 'Call Center Note', label: 'Call Center Agent Note' },
    { key: 'Organizer Note', label: 'Organizer Note' },
    { key: 'Created At', label: 'Creation Date' },
    { key: 'Updated At', label: 'Last Updated' }
  ];

  const [selectedColumns, setSelectedColumns] = useState<string[]>(['Name', 'Phone', 'Entity', 'Platform', 'Status', 'Created At']);

  // Database Prep & Bulk Import States
  const [rawImportText, setRawImportText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [importErrorMsg, setImportErrorMsg] = useState<string | null>(null);

  // Unconverted Contacts state
  const [unconvertedContacts, setUnconvertedContacts] = useState<UnconvertedContact[]>([]);

  // Booked tab state
  const [bookedNoteInput, setBookedNoteInput] = useState('');
  const [bookedViewFilter, setBookedViewFilter] = useState<'Pending' | 'History'>('Pending');

  // Sync state with local DB
  const refreshLeads = async (newSelectedId?: string) => {
    const fresh = await DatabaseService.getLeads();
    const freshUsers = await DatabaseService.getUsers();
    setLeads(fresh);
    setTeamUsers(freshUsers);
    if (newSelectedId) {
      const found = fresh.find(l => l.id === newSelectedId);
      if (found) setSelectedLead(found);
    } else if (selectedLead) {
      const found = fresh.find(l => l.id === selectedLead.id);
      setSelectedLead(found || fresh[0] || null);
    } else {
      setSelectedLead(fresh[0] || null);
    }
    if (onLeadOptimized) onLeadOptimized();
  };

  React.useEffect(() => {
    refreshLeads();
  }, []);

  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setOrganizerNoteInput(lead.organizerNote || '');
    setSuccessMsg(null);
  };

  const handleSaveOrganizerNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;

    const trimmedNote = organizerNoteInput.trim();
    const res = await DatabaseService.updateLead(
      selectedLead.id,
      { organizerNote: trimmedNote },
      currentUser
    );

    if (res.success) {
      if (notifyRole !== 'None') {
        const messageContent = `Weddan guidelines updated for lead "${selectedLead.name}" (${selectedLead.phone}): "${trimmedNote}"`;
        await DatabaseService.addMessage(messageContent, currentUser, notifyRole);
      }
      setSuccessMsg('Organizer weddan guidelines updated successfully!');
      setNotifyRole('None');
      await refreshLeads(selectedLead.id);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleUpdateAttendanceStatus = async (status: 'Pending' | 'Attended' | 'No-Show' | 'Booked') => {
    if (!selectedLead) return;
    
    if (status === 'No-Show' && !selectedLead.organizerNote?.trim() && !organizerNoteInput.trim()) {
      alert('Please add an organizer note before marking as No-Show.');
      return;
    }
    
    const res = await DatabaseService.updateLead(
      selectedLead.id,
      { attendanceStatus: status },
      currentUser
    );

    if (res.success) {
      setSuccessMsg(`Attendance status updated to ${status}!`);
      await refreshLeads(selectedLead.id);
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  // Preset templates helper
  const applyPresetTemplate = (template: string) => {
    setOrganizerNoteInput(template);
  };

  // User Management Actions
  const openAddUserForm = () => {
    setUserForm({ name: '', role: 'Call Center', pin: '', avatarColor: 'bg-blue-600' });
    setUserError(null);
    setEditingUser(null);
    setIsAddingUser(true);
  };

  const openEditUserForm = (u: SystemUser) => {
    setUserForm({ name: u.name, role: u.role, pin: u.pin, avatarColor: u.avatarColor });
    setUserError(null);
    setEditingUser(u);
    setIsAddingUser(true);
  };

  const handleUserFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError(null);

    if (userForm.name.trim().length < 2) {
      setUserError('Name must be at least 2 characters long.');
      return;
    }
    if (!/^\d{4}$/.test(userForm.pin)) {
      setUserError('PIN must be exactly 4 digits.');
      return;
    }

    const newUser: SystemUser = {
      name: userForm.name.trim(),
      role: userForm.role,
      pin: userForm.pin,
      avatarColor: userForm.avatarColor
    };

    if (editingUser) {
      const res = await DatabaseService.updateUser(editingUser.pin, newUser);
      if (res.success) {
        setUserSuccess(`Successfully updated ${newUser.name}'s details.`);
        setIsAddingUser(false);
        setEditingUser(null);
        const freshUsers = await DatabaseService.getUsers();
        setTeamUsers(freshUsers);
        setTimeout(() => setUserSuccess(null), 3500);
      } else {
        setUserError(res.error || 'Failed to update user.');
      }
    } else {
      const res = await DatabaseService.addUser(newUser);
      if (res.success) {
        setUserSuccess(`Successfully added ${newUser.name} to the team database.`);
        setIsAddingUser(false);
        const freshUsers = await DatabaseService.getUsers();
        setTeamUsers(freshUsers);
        setTimeout(() => setUserSuccess(null), 3500);
      } else {
        setUserError(res.error || 'Failed to add user.');
      }
    }
  };

  const handleDeleteUser = async (pin: string) => {
    const userToDel = teamUsers.find(u => u.pin === pin);
    if (!userToDel) return;
    
    if (userToDel.name === currentUser.name) {
      setUserError('You cannot delete your own active administrator profile.');
      setTimeout(() => setUserError(null), 4000);
      return;
    }

    if (window.confirm(`Are you sure you want to delete ${userToDel.name} (${userToDel.role})? This removes their 4-digit PIN authorization.`)) {
      const res = await DatabaseService.deleteUser(pin);
      if (res.success) {
        setUserSuccess(`Removed ${userToDel.name} from authorized team list.`);
        const freshUsers = await DatabaseService.getUsers();
        setTeamUsers(freshUsers);
        setTimeout(() => setUserSuccess(null), 3500);
      } else {
        setUserError(res.error || 'Failed to delete user.');
        setTimeout(() => setUserError(null), 4000);
      }
    }
  };

  // Custom Report Filtering
  const getFilteredReportLeads = () => {
    return leads.filter(lead => {
      const leadDate = new Date(lead.createdAt);
      if (reportFromDate) {
        const fromDate = new Date(reportFromDate);
        fromDate.setHours(0,0,0,0);
        if (leadDate < fromDate) return false;
      }
      if (reportToDate) {
        const toDate = new Date(reportToDate);
        toDate.setHours(23,59,59,999);
        if (leadDate > toDate) return false;
      }
      return true;
    });
  };

  // Export Custom Mapped Columns CSV
  const handleExportCSV = () => {
    const reportLeads = getFilteredReportLeads();
    
    // Generate CSV headers based on selected columns
    const headers = selectedColumns;
    let csvRows = [headers.join(',')];

    for (const lead of reportLeads) {
      const rowData = headers.map(col => {
        let val: any = '';
        let isPhone = false;
        switch (col) {
          case 'ID': val = lead.id; break;
          case 'Name': val = lead.name; break;
          case 'Phone': val = lead.phone; isPhone = true; break;
          case 'Entity': val = lead.entity; break;
          case 'Platform': val = lead.platform; break;
          case 'Priority': val = lead.priority; break;
          case 'Status': val = lead.status; break;
          case 'Inquiry Note': val = lead.inquiryNote; break;
          case 'With Booking': val = lead.commissionEligible ? 'Yes' : 'No'; break;
          case 'Attendance Status': val = lead.attendanceStatus || 'Pending'; break;
          case 'Added By': val = lead.addedBy; break;
          case 'Assigned Agent': val = lead.assignedAgent; break;
          case 'Follow-Up Due': val = lead.followUpDue || 'None'; break;
          case 'Call Center Note': val = lead.callCenterNote || 'None'; break;
          case 'Organizer Note': val = lead.organizerNote || 'None'; break;
          case 'Created At': {
            const date = new Date(lead.createdAt);
            val = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            break;
          }
          case 'Updated At': val = lead.updatedAt; break;
          default: val = '';
        }
        const cleanVal = String(val).replace(/"/g, '""');
        if (isPhone) {
          return `"=""${cleanVal}"""`;
        }
        return `"${cleanVal}"`;
      });
      csvRows.push(rowData.join(','));
    }

    // Include unconverted contacts rows if toggled
    if (includeUnconvertedInReport) {
      for (const uc of reportUnconvertedData) {
        const rowData = headers.map(col => {
          let val: any = '';
          let isPhone = false;
          switch (col) {
            case 'Name': val = uc.name || 'Unknown'; break;
            case 'Phone': val = uc.phone || 'N/A'; isPhone = true; break;
            case 'Entity': val = uc.entity; break;
            case 'Platform': val = uc.platform; break;
            case 'Inquiry Note': val = `Unconverted: ${uc.reason}`; break;
            case 'Added By': val = uc.loggedBy; break;
            case 'Created At': {
              const date = new Date(uc.createdAt);
              val = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
              break;
            }
            default: val = '-';
          }
          const cleanVal = String(val).replace(/"/g, '""');
          if (isPhone) {
            return `"=""${cleanVal}"""`;
          }
          return `"${cleanVal}"`;
        });
        csvRows.push(rowData.join(','));
      }
    }

    const BOM = '\uFEFF';
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(BOM + csvRows.join('\n'));
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", `eyeworld_mapped_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Database Purge Handler
  const handlePurgeDatabase = async () => {
    if (window.confirm('CRITICAL ACTION: This will permanently delete ALL active patient leads and clear the entire CRM. Are you ready to empty the system to upload previous contact data?')) {
      const res = await DatabaseService.clearLeadsDatabase();
      if (res.success) {
        setImportSuccessMsg(`Database cleared successfully! Purged ${res.count} mock leads. The application is now in a clean state and primed for previous sheet contact uploads.`);
        await refreshLeads();
        setTimeout(() => setImportSuccessMsg(null), 6000);
      }
    }
  };

  // Bulk Contact Paste/Import Simulator Handler
  const handlePasteImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportErrorMsg(null);
    setImportSuccessMsg(null);

    if (!rawImportText.trim()) {
      setImportErrorMsg('Please paste some CSV or structured text data to import.');
      return;
    }

    try {
      // Basic CSV/Structured lines parser to allow raw sheets copy-paste
      const lines = rawImportText.trim().split('\n');
      if (lines.length < 1) throw new Error('Data format invalid');

      const parsedLeads: any[] = [];
      
      lines.forEach((line, i) => {
        // Support either tab-separated (copied from sheets) or comma-separated columns
        const cols = line.includes('\t') ? line.split('\t') : line.split(',');
        
        if (cols.length >= 2) {
          // Columns: Name, Phone, Entity(optional), Platform(optional), InquiryNote(optional), Priority(optional)
          const name = cols[0]?.trim();
          const phone = cols[1]?.trim();
          
          if (name && phone) {
            parsedLeads.push({
              name,
              phone,
              entity: (cols[2]?.trim() || 'Eye World') as any,
              platform: (cols[3]?.trim() || 'WhatsApp') as any,
              priority: (cols[4]?.trim() || 'Warm') as any,
              status: 'Pending Call Center' as any,
              inquiryNote: cols[5]?.trim() || 'Imported contact backup from Google Sheets',
              addedBy: currentUser.name,
              assignedAgent: 'Unassigned',
              followUpDue: null,
              callCenterNote: '',
              organizerNote: '',
              organizerNoteUpdatedAt: null,
              isBookedForAppointment: false
            });
          }
        }
      });

      if (parsedLeads.length === 0) {
        setImportErrorMsg('No valid rows found. Copy-paste rows from your Google Sheet with Name and Phone in the first two columns.');
        return;
      }

      const res = await DatabaseService.importLeadsBatch(parsedLeads, currentUser.name);
      setImportSuccessMsg(`Import successful! Added ${res.imported} contacts into active directory. Skipped ${res.duplicates} existing duplicates.`);
      setRawImportText('');
      await refreshLeads();
      setTimeout(() => setImportSuccessMsg(null), 5000);

    } catch (err) {
      setImportErrorMsg('Failed to parse text. Please ensure columns are aligned as Name [tab/comma] Phone [tab/comma] Clinic.');
    }
  };

  // Filter Directory Leads
  const filteredLeads = leads.filter(lead => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      lead.name.toLowerCase().includes(query) || 
      lead.phone.includes(query);

    const matchesStatus = statusFilter === 'All' || lead.status === statusFilter;
    const matchesPriority = priorityFilter === 'All' || lead.priority === priorityFilter;

    return matchesSearch && matchesStatus && matchesPriority;
  });

  const allBookedLeads = leads.filter(lead => lead.isBookedForAppointment || lead.status === 'Booked/Confirmed');
  const bookedLeads = allBookedLeads.filter(lead => {
    if (bookedViewFilter === 'Pending') {
      return !lead.attendanceStatus || lead.attendanceStatus === 'Pending';
    }
    return lead.attendanceStatus === 'Attended' || lead.attendanceStatus === 'No-Show';
  });

  const templates = [
    { label: "ASAP Diagnostic", text: "ASAP: Patient needs urgent diagnostic testing for vision correction (LASIK/Cataract). Coordinate nearest available slot." },
    { label: "Follow-Up Retainer", text: "Follow-up priority: Interested but requested callbacks after salary day. Call center agent must pursue closely." },
    { label: "Discount Inquiry", text: "Discount Inquiry: Enquired about family packages or discount plans. Mention our installment partner schemes." },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8" id="organizer-root-console">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0" id="organizer-header">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
            <span>Organizer Operations Console</span>
          </h1>
          <p className="mt-2 text-sm text-neutral-400 font-medium">
            Active Session: <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20 font-mono text-xs">{currentUser.name} ({currentUser.role})</span>
          </p>
        </div>

        <button
          onClick={() => refreshLeads()}
          className="flex items-center space-x-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-semibold shadow-md transition-all cursor-pointer"
          id="sync-leads-btn"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Sync Operations</span>
        </button>
      </div>

      {/* Tabs navigation toggles */}
      <div className="flex justify-start" id="organizer-navigation-tabs">
        <div className="bg-neutral-950 border border-neutral-800 p-1 rounded-xl flex space-x-1 w-full sm:w-auto shadow-md">
          <button
            onClick={() => setActiveTab('leads')}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leads' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            id="tab-leads"
          >
            Leads & Optimizer
          </button>
          
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'reports' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
            }`}
            id="tab-reports"
          >
            Custom Report Builder
          </button>

          {(currentUser.role === 'Organizer' || currentUser.role === 'Admin') && (
            <button
              onClick={() => setActiveTab('booked')}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'booked' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              id="tab-booked"
            >
              <Calendar className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              Booked
            </button>
          )}

          {currentUser.role === 'Admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'
              }`}
              id="tab-users"
            >
              Team Management
            </button>
          )}
        </div>
      </div>

      {activeTab === 'leads' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8" id="leads-dashboard-grid">
          {/* Left Column: All Leads Listings */}
          <div className="glass-panel shadow-xl flex flex-col h-[600px] rounded-2xl">
            {/* Search and filters */}
            <div className="p-4 border-b border-neutral-800 space-y-3 bg-neutral-950/40">
              <div className="relative">
                <Search className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500 w-4 h-4" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lead database..."
                  className="block w-full pl-10 pr-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-xs font-medium text-white shadow-md placeholder:text-neutral-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
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
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-lg p-2 text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="All">All Priorities</option>
                  <option value="Hot">Hot Priority</option>
                  <option value="Warm">Warm Priority</option>
                  <option value="Cold">Cold Priority</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-850">
              {filteredLeads.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 space-y-2 mt-12">
                  <Layers className="w-8 h-8 mx-auto text-neutral-600" />
                  <p className="text-xs font-semibold">No patient records match</p>
                  <p className="text-[10px]">Create leads or adjust directories filters</p>
                </div>
              ) : (
                filteredLeads.map((lead) => {
                  const isSelected = selectedLead?.id === lead.id;
                  return (
                    <button
                      key={lead.id}
                      onClick={() => handleSelectLead(lead)}
                      className={`w-full text-left p-4 hover:bg-neutral-900/30 transition-colors duration-150 flex flex-col space-y-1.5 focus:outline-none border-l-4 cursor-pointer ${
                        isSelected ? 'bg-emerald-500/5 border-emerald-500' : 'border-transparent'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-white text-xs truncate max-w-[150px]">{lead.name}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${
                          lead.priority === 'Hot' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                          lead.priority === 'Warm' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                          'bg-neutral-800 text-neutral-400 border-neutral-700'
                        }`}>{lead.priority}</span>
                      </div>

                      <div className="flex justify-between items-center text-[10px] text-neutral-400 font-mono">
                        <span>{lead.phone}</span>
                        <span className="font-bold text-neutral-500">{lead.entity}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-900/60">
                        <span>Status: <span className="font-semibold text-neutral-400">{lead.status}</span></span>
                        <div className="flex items-center space-x-1.5">
                          {lead.attendanceStatus && lead.attendanceStatus !== 'Pending' && (
                            <span className={`text-[9px] font-bold px-1 rounded border ${
                              lead.attendanceStatus === 'Attended'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            }`}>
                              {lead.attendanceStatus}
                            </span>
                          )}
                          {lead.organizerNote && (
                            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 rounded border border-emerald-500/20">Optimized</span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Optimizer & weddan guidelines form */}
          <div className="lg:col-span-2 space-y-6">
            {selectedLead ? (
              <div className="space-y-6">
                {/* Lead Summary Overview */}
                <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-xl">
                  <div className="flex justify-between items-start border-b border-neutral-850 pb-3">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">{selectedLead.entity}</span>
                      <h3 className="text-lg font-extrabold text-white">{selectedLead.name}</h3>
                      <p className="text-xs font-mono font-bold text-emerald-400">{selectedLead.phone}</p>
                    </div>

                    <div className="text-right text-xs text-neutral-400 space-y-1">
                      <p>Platform: <span className="font-bold text-neutral-200">{selectedLead.platform}</span></p>
                      <div className="flex items-center justify-end space-x-1.5">
                        <span>Status:</span>
                        {(currentUser.role === 'Organizer' || currentUser.role === 'Admin') ? (
                          <select
                            value={selectedLead.status}
                            onChange={async (e) => {
                              const newStatus = e.target.value as any;
                              const res = await DatabaseService.updateLead(
                                selectedLead.id,
                                { status: newStatus },
                                currentUser
                              );
                              if (res.success) {
                                setSuccessMsg(`Status updated to ${newStatus}`);
                                await refreshLeads(selectedLead.id);
                                setTimeout(() => setSuccessMsg(null), 3000);
                              }
                            }}
                            className="bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs font-bold rounded py-0.5 pl-1 pr-6 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          >
                            <option value="Pending Call Center">Pending Call Center</option>
                            <option value="Under Follow-Up">Under Follow-Up</option>
                            <option value="Booked/Confirmed">Booked/Confirmed</option>
                            <option value="Canceled">Canceled</option>
                            <option value="Re-engage Lead">Re-engage Lead</option>
                          </select>
                        ) : (
                          <span className="font-bold text-neutral-200">{selectedLead.status}</span>
                        )}
                      </div>
                      <p>Assigned Agent: <span className="font-bold text-emerald-400">{selectedLead.assignedAgent}</span></p>
                    </div>
                  </div>

                  <div className="space-y-1.5 bg-neutral-950/40 p-3.5 rounded-xl border border-neutral-850/80">
                    <h4 className="text-[10px] uppercase font-bold text-neutral-500">Original Intake Statement</h4>
                    <p className="text-xs text-neutral-300 font-medium leading-relaxed">"{selectedLead.inquiryNote}"</p>
                  </div>

                  {/* Call Center Note */}
                  {selectedLead.callCenterNote && (
                    <div className="space-y-1.5 bg-blue-500/10 p-3.5 rounded-xl border border-blue-500/20">
                      <h4 className="text-[10px] uppercase font-bold text-blue-400">Call Center Note</h4>
                      <p className="text-xs text-blue-200 font-medium leading-relaxed">"{selectedLead.callCenterNote}"</p>
                    </div>
                  )}

                  {/* With Booking (commissionEligible) read-only display for Admin & Organizer */}
                  <div className="flex justify-between items-center bg-neutral-950/20 p-3 rounded-xl border border-neutral-850">
                    <div className="text-xs text-neutral-300">
                      <p className="font-bold text-white">With Booking Eligible</p>
                      <p className="text-[10px] text-neutral-500">Commission eligibility status set at intake</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                      selectedLead.commissionEligible 
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                        : 'bg-neutral-950 text-neutral-400 border-neutral-850'
                    }`}>
                      {selectedLead.commissionEligible ? 'Yes' : 'No'}
                    </span>
                  </div>

                  {/* Patient Attendance Status section (Organizer & Admin can confirm/edit) */}
                  <div className="bg-neutral-950/20 p-3.5 rounded-xl border border-neutral-850 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-neutral-300">
                        <p className="font-bold text-white">Patient Appointment Attendance</p>
                        <p className="text-[10px] text-neutral-500">Attendance confirmation for commission release workflow</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                        selectedLead.attendanceStatus === 'Booked'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : selectedLead.attendanceStatus === 'Attended'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : selectedLead.attendanceStatus === 'No-Show'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-neutral-950 text-neutral-400 border-neutral-850'
                      }`}>
                        {selectedLead.attendanceStatus || 'Pending'}
                      </span>
                    </div>

                    {(currentUser.role === 'Organizer' || currentUser.role === 'Admin') ? (
                      <div className="grid grid-cols-4 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleUpdateAttendanceStatus('Pending')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                            (selectedLead.attendanceStatus || 'Pending') === 'Pending'
                              ? 'bg-neutral-800 text-white border-neutral-700'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-900 hover:text-white hover:bg-neutral-900'
                          }`}
                        >
                          Pending
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAttendanceStatus('Booked')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                            selectedLead.attendanceStatus === 'Booked'
                              ? 'bg-blue-600/20 text-blue-400 border-blue-500/30'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-900 hover:text-blue-400 hover:bg-blue-950/20'
                          }`}
                        >
                          Booked
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAttendanceStatus('Attended')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                            selectedLead.attendanceStatus === 'Attended'
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-900 hover:text-emerald-400 hover:bg-emerald-950/20'
                          }`}
                        >
                          Attended
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateAttendanceStatus('No-Show')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-all border cursor-pointer ${
                            selectedLead.attendanceStatus === 'No-Show'
                              ? 'bg-rose-600/20 text-rose-400 border-rose-500/30'
                              : 'bg-neutral-950 text-neutral-400 border-neutral-900 hover:text-rose-400 hover:bg-rose-950/20'
                          }`}
                        >
                          No-Show
                        </button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-neutral-500 italic">Only Organizer and Admin roles can update patient attendance.</p>
                    )}
                  </div>
                </div>

                {/* Organizer Note Editor */}
                <div className="bg-neutral-900/60 border border-neutral-800 shadow-2xl rounded-2xl p-6 space-y-6">
                  <div className="flex items-center justify-between border-b border-neutral-850 pb-3">
                    <h3 className="text-base font-bold flex items-center space-x-2 text-white">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Write weddan Lead Guidelines</span>
                    </h3>
                    <span className="text-[10px] text-neutral-500 font-bold uppercase tracking-wider">Guidelines for Call Center Agents</span>
                  </div>

                  {/* Preset helpers */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-neutral-400">Preset quick-fill guidelines templates:</p>
                    <div className="flex flex-wrap gap-2">
                      {templates.map(t => (
                        <button
                          key={t.label}
                          type="button"
                          onClick={() => applyPresetTemplate(t.text)}
                          className="px-2.5 py-1.5 bg-neutral-950 hover:bg-neutral-850 border border-neutral-800 hover:border-emerald-500/50 rounded-lg text-[10px] font-bold text-neutral-300 transition-all cursor-pointer"
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={handleSaveOrganizerNote} className="space-y-6">
                    <div>
                      <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">Organizer weddan Directives / Notes</label>
                      <textarea
                        rows={4}
                        value={organizerNoteInput}
                        onChange={(e) => setOrganizerNoteInput(e.target.value)}
                        placeholder="Write direct advice or guidelines for the call center agent here (e.g., Patient is highly interested in Dr. Ihab Lasik offer. Pitch premium diagnostic scans first to maximize conversion rate.)"
                        className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none text-xs font-medium placeholder:text-neutral-700 leading-relaxed"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-t border-neutral-850 pt-4 gap-4">
                      <div className="flex items-center space-x-3 bg-neutral-950 p-2 rounded-xl border border-neutral-850">
                        <label htmlFor="notify-select" className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider pl-1">
                          Notify:
                        </label>
                        <select
                          id="notify-select"
                          value={notifyRole}
                          onChange={(e) => setNotifyRole(e.target.value as any)}
                          className="bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg text-xs font-semibold px-2 py-1.5 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                        >
                          <option value="None">No Notification</option>
                          <option value="All">All Roles</option>
                          <option value="Call Center">Call Center</option>
                          <option value="Moderators">Moderators</option>
                          <option value="Team Leaders">Team Leaders</option>
                        </select>
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-lg shadow-emerald-950/40 transition-all cursor-pointer border border-emerald-500/10"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Save Guidelines</span>
                      </button>
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
                <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-xl mt-6">
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
                </div>
              </div>
            ) : (
              <div className="glass-panel shadow-xl rounded-2xl p-12 text-center text-neutral-500 space-y-3 mt-12">
                <ShieldAlert className="w-12 h-12 mx-auto text-neutral-700" />
                <p className="font-bold text-white">No active leads selected</p>
                <p className="text-xs max-w-sm mx-auto text-neutral-500">Register leads inside the Intake platform to optimize workflow guidelines.</p>
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'reports' ? (
        /* Brand New: Custom Report Builder with Mapped Columns */
        <div className="space-y-8 animate-fadeIn" id="custom-reports-view">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Left Column: Report Parameters */}
            <div className="glass-panel p-6 rounded-2xl border border-neutral-800 bg-neutral-900/40 shadow-xl space-y-6">
              <div>
                <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 uppercase tracking-wider font-mono">
                  <Filter className="w-4 h-4 text-emerald-400" />
                  <span>Report Parameters</span>
                </h3>
                <p className="text-[11px] text-neutral-500 mt-1">Select date ranges and custom display columns for your export sheet.</p>
              </div>

              {/* Date Ranges in aa/mm/year (dd/mm/yyyy) */}
              <div className="space-y-4 pt-2 border-t border-neutral-850">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">1. Date Interval Filter</h4>
                
                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">From Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={reportFromDate}
                        onChange={(e) => setReportFromDate(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">To Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        value={reportToDate}
                        onChange={(e) => setReportToDate(e.target.value)}
                        className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-neutral-500 flex items-start space-x-1 font-medium bg-neutral-950/40 p-2 rounded-lg border border-neutral-850/60">
                  <span className="text-emerald-400 font-bold">💡 Note:</span>
                  <span>Leave values blank to generate a lifetime report of all clinic data.</span>
                </div>
              </div>

              {/* Column Mapping Selectors */}
              <div className="space-y-3 pt-4 border-t border-neutral-850">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">2. Column Mapping</h4>
                  <button 
                    onClick={() => setSelectedColumns(ALL_REPORT_COLUMNS.map(c => c.key))}
                    className="text-[10px] text-emerald-400 hover:underline font-bold"
                  >
                    Select All
                  </button>
                </div>
                
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 bg-neutral-950/20 p-2 rounded-xl border border-neutral-850/50">
                  {ALL_REPORT_COLUMNS.map((col) => {
                    const isChecked = selectedColumns.includes(col.key);
                    return (
                      <label key={col.key} className="flex items-center space-x-2.5 p-1.5 hover:bg-neutral-900/30 rounded-lg cursor-pointer transition text-xs font-semibold text-neutral-300">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              if (selectedColumns.length > 1) {
                                setSelectedColumns(selectedColumns.filter(c => c !== col.key));
                              }
                            } else {
                              setSelectedColumns([...selectedColumns, col.key]);
                            }
                          }}
                          className="rounded border-neutral-800 bg-neutral-950 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                        />
                        <span>{col.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Unconverted Contacts Toggle */}
              <div className="space-y-3 pt-4 border-t border-neutral-850">
                <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wide">3. Additional Data Sources</h4>
                <label className="flex items-center space-x-2.5 p-2.5 bg-neutral-950/40 rounded-xl border border-neutral-850/60 cursor-pointer transition hover:bg-neutral-900/30">
                  <input
                    type="checkbox"
                    checked={includeUnconvertedInReport}
                    onChange={async (e) => {
                      setIncludeUnconvertedInReport(e.target.checked);
                      if (e.target.checked) {
                        const data = await DatabaseService.getUnconvertedContacts();
                        setReportUnconvertedData(data);
                      }
                    }}
                    className="rounded border-neutral-800 bg-neutral-950 text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                  />
                  <div className="text-xs">
                    <span className="font-bold text-neutral-200">Include Unconverted Contacts</span>
                    <p className="text-[10px] text-neutral-500">Add rows for contacts that were not converted to leads</p>
                  </div>
                </label>
              </div>

              {/* Export Button */}
              <div className="pt-4 border-t border-neutral-850">
                <button
                  onClick={handleExportCSV}
                  className="w-full flex justify-center items-center space-x-2 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-950/30 border border-emerald-500/10 cursor-pointer transition-all"
                  id="btn-export-report"
                >
                  <Download className="w-4 h-4" />
                  <span>Generate Mapped Report (.CSV)</span>
                </button>
              </div>
            </div>

            {/* Right Side: Live Report Preview & Clean-up Console */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Report Preview */}
              <div className="glass-panel rounded-2xl shadow-xl overflow-hidden border border-neutral-800 flex flex-col h-[400px]">
                <div className="bg-neutral-950/60 px-6 py-4 flex items-center justify-between border-b border-neutral-800">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-400" />
                      <span>Custom Report Sheet Live Preview</span>
                    </h3>
                    <p className="text-[11px] text-neutral-500 mt-0.5">Showing matching rows with your custom columns. Export matches spreadsheet.</p>
                  </div>
                  <span className="bg-neutral-800 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold border border-neutral-700">Matches: {getFilteredReportLeads().length + (includeUnconvertedInReport ? reportUnconvertedData.length : 0)} rows</span>
                </div>

                <div className="flex-1 overflow-auto bg-neutral-950/20">
                  {getFilteredReportLeads().length === 0 && (!includeUnconvertedInReport || reportUnconvertedData.length === 0) ? (
                    <div className="p-16 text-center text-neutral-500 space-y-2">
                      <Layers className="w-10 h-10 mx-auto text-neutral-700" />
                      <p className="text-xs font-bold text-white">No entries match parameters</p>
                      <p className="text-[10px] max-w-xs mx-auto">There are no leads created in this date range. Register raw records first.</p>
                    </div>
                  ) : (
                    <table className="w-full text-[11px] font-medium text-neutral-400 text-left border-collapse">
                      <thead className="bg-neutral-950 text-neutral-400 uppercase font-bold tracking-wider border-b border-neutral-800 sticky top-0 font-mono text-[9px]">
                        <tr>
                          {selectedColumns.map(col => (
                            <th key={col} className="px-4 py-3 border-r border-neutral-850/60 min-w-[100px]">{col}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-850">
                        {getFilteredReportLeads().map((lead) => (
                          <tr key={lead.id} className="hover:bg-neutral-900/20 transition">
                            {selectedColumns.map(col => {
                              let value = '';
                              switch (col) {
                                case 'ID': value = lead.id.slice(0,8); break;
                                case 'Name': value = lead.name; break;
                                case 'Phone': value = lead.phone; break;
                                case 'Entity': value = lead.entity; break;
                                case 'Platform': value = lead.platform; break;
                                case 'Priority': value = lead.priority; break;
                                case 'Status': value = lead.status; break;
                                case 'Inquiry Note': value = lead.inquiryNote; break;
                                case 'With Booking': value = lead.commissionEligible ? 'Yes' : 'No'; break;
                                case 'Added By': value = lead.addedBy; break;
                                case 'Assigned Agent': value = lead.assignedAgent; break;
                                case 'Follow-Up Due': value = lead.followUpDue || 'None'; break;
                                case 'Call Center Note': value = lead.callCenterNote || '-'; break;
                                case 'Organizer Note': value = lead.organizerNote || '-'; break;
                                case 'Created At': {
                                  const d = new Date(lead.createdAt);
                                  value = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                  break;
                                }
                                case 'Updated At': value = lead.updatedAt.split('T')[0]; break;
                              }
                              return (
                                <td key={col} className="px-4 py-2.5 border-r border-neutral-850/40 truncate max-w-[180px]" title={value}>
                                  {col === 'Priority' ? (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      value === 'Hot' ? 'bg-rose-500/10 text-rose-400' :
                                      value === 'Warm' ? 'bg-amber-500/10 text-amber-400' :
                                      'bg-neutral-800 text-neutral-400'
                                    }`}>{value}</span>
                                  ) : col === 'With Booking' ? (
                                    <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                                      value === 'Yes' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                                      'bg-neutral-800 text-neutral-400 border border-neutral-750'
                                    }`}>{value}</span>
                                  ) : value}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                        {includeUnconvertedInReport && reportUnconvertedData.map((uc) => (
                          <tr key={uc.id} className="hover:bg-neutral-900/20 transition bg-amber-500/5">
                            {selectedColumns.map(col => {
                              let value = '';
                              switch (col) {
                                case 'Name': value = uc.name || 'Unknown'; break;
                                case 'Phone': value = uc.phone || 'N/A'; break;
                                case 'Entity': value = uc.entity; break;
                                case 'Platform': value = uc.platform; break;
                                case 'Inquiry Note': value = `Unconverted: ${uc.reason}`; break;
                                case 'Added By': value = uc.loggedBy; break;
                                case 'Created At': {
                                  const d = new Date(uc.createdAt);
                                  value = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                                  break;
                                }
                                default: value = '-';
                              }
                              return (
                                <td key={col} className="px-4 py-2.5 border-r border-neutral-850/40 truncate max-w-[180px] text-amber-300/70" title={value}>
                                  {value}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* CRM Prime, Purge, and Contact Import Console */}
              <div className="glass-panel p-6 rounded-2xl border border-neutral-800 bg-neutral-900/30 space-y-6">
                <div>
                  <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 uppercase tracking-wider font-mono">
                    <Database className="w-4 h-4 text-emerald-400" />
                    <span>CRM Clean-up & Spreadsheet Import Console</span>
                  </h3>
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Empty the CRM to ready it for your actual spreadsheet contacts, or paste Google Sheets backup rows below.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-850">
                  
                  {/* Purge Box */}
                  <div className="p-4 bg-rose-950/10 border border-rose-500/20 rounded-xl space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="bg-rose-500/10 text-rose-400 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase border border-rose-500/20">Purge Active Database</span>
                      <h4 className="text-xs font-bold text-neutral-200 mt-2">Clear Mock Leads Data</h4>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Delete the existing pre-loaded placeholder patients (Ahmed Mansour, Sarah El-Shenawy, etc.) to start fresh with a blank database.
                      </p>
                    </div>

                    <button
                      onClick={handlePurgeDatabase}
                      className="w-full py-2.5 mt-2 bg-rose-950/40 border border-rose-500/30 hover:bg-rose-600 hover:text-white transition rounded-xl text-xs font-extrabold text-rose-400 cursor-pointer shadow-md"
                    >
                      Purge Leads (Clean Slate)
                    </button>
                  </div>

                  {/* Paste Box */}
                  <form onSubmit={handlePasteImport} className="space-y-3 flex flex-col justify-between">
                    <div>
                      <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-2 py-0.5 rounded font-mono font-bold uppercase border border-emerald-500/20">Google Sheet Paste Import</span>
                      <h4 className="text-xs font-bold text-neutral-200 mt-2">Direct Row Copy-Paste</h4>
                      <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                        Ready your previous Sheets data. Paste spreadsheet rows directly (column order: Name [tab] Phone [tab] Clinic).
                      </p>
                    </div>

                    <div className="space-y-2 mt-2">
                      <textarea
                        rows={2}
                        value={rawImportText}
                        onChange={(e) => setRawImportText(e.target.value)}
                        placeholder="Ahmed Hamdi	01029384756	Dr. Ihab&#10;Nermin Aly	01222445566	Eye World"
                        className="block w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-[10px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
                      />
                      <button
                        type="submit"
                        className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 hover:border-emerald-500/40 text-neutral-300 hover:text-white transition rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Parse & Import Rows</span>
                      </button>
                    </div>
                  </form>
                </div>

                {importSuccessMsg && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-emerald-950/40 border border-emerald-800/80 p-3 rounded-lg flex items-center space-x-2 text-emerald-400 text-xs font-semibold"
                  >
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <span>{importSuccessMsg}</span>
                  </motion.div>
                )}

                {importErrorMsg && (
                  <div className="bg-rose-950/20 border border-rose-500/30 p-3 rounded-lg flex items-center space-x-2 text-rose-400 text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{importErrorMsg}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'booked' ? (
        <div className="space-y-6 animate-fadeIn" id="booked-tab-view">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Calendar className="w-5 h-5 text-emerald-400" />
                <span>Booked Appointments</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Leads with confirmed bookings. Manage attendance and add notes.</p>
            </div>
            
            <div className="flex items-center space-x-2 bg-neutral-950 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setBookedViewFilter('Pending')}
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${bookedViewFilter === 'Pending' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                Pending
              </button>
              <button
                onClick={() => setBookedViewFilter('History')}
                className={`px-3 py-1.5 rounded text-[10px] font-bold transition-all ${bookedViewFilter === 'History' ? 'bg-neutral-800 text-white' : 'text-neutral-500 hover:text-neutral-300'}`}
              >
                History
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {bookedLeads.length === 0 ? (
              <div className="glass-panel rounded-2xl p-12 text-center text-neutral-500 space-y-3">
                <Calendar className="w-10 h-10 mx-auto text-neutral-700" />
                <p className="text-xs font-bold text-white">No booked appointments</p>
                <p className="text-[10px] max-w-sm mx-auto">Leads with confirmed bookings will appear here.</p>
              </div>
            ) : (
              bookedLeads.map((lead) => (
                <div key={lead.id} className="glass-panel rounded-2xl p-5 border border-neutral-800 space-y-4 shadow-md">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-bold text-white text-sm">{lead.name}</h4>
                      <p className="text-xs font-mono text-emerald-400">{lead.phone}</p>
                      <p className="text-[10px] text-neutral-500 mt-0.5">{lead.entity} · {lead.platform}</p>
                    </div>
                    <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                      lead.attendanceStatus === 'Attended'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : lead.attendanceStatus === 'No-Show'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                    }`}>
                      {lead.attendanceStatus || 'Pending'}
                    </span>
                  </div>

                  <div className="flex items-center space-x-2">
                    {(['Pending', 'Attended', 'No-Show'] as const).map((status) => (
                      <button
                        key={status}
                        onClick={async () => {
                          if (status === 'No-Show' && !lead.organizerNote?.trim()) {
                            alert('Please add a note for this booking before marking as No-Show.');
                            return;
                          }
                          const res = await DatabaseService.updateLead(lead.id, { attendanceStatus: status }, currentUser);
                          if (res.success) await refreshLeads();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          (lead.attendanceStatus || 'Pending') === status
                            ? status === 'Attended'
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/30'
                              : status === 'No-Show'
                              ? 'bg-rose-600/20 text-rose-400 border-rose-500/30'
                              : 'bg-neutral-800 text-white border-neutral-700'
                            : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white hover:bg-neutral-900'
                        }`}
                      >
                        {status === 'Attended' ? <UserCheck className="w-3 h-3 inline mr-1" /> : status === 'No-Show' ? <X className="w-3 h-3 inline mr-1" /> : <Clock className="w-3 h-3 inline mr-1" />}
                        {status}
                      </button>
                    ))}
                  </div>

                  <div className="border-t border-neutral-800 pt-3">
                    <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Organizer Note</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        defaultValue={lead.organizerNote || ''}
                        onBlur={async (e) => {
                          if (e.target.value !== (lead.organizerNote || '')) {
                            await DatabaseService.updateLead(lead.id, { organizerNote: e.target.value }, currentUser);
                            await refreshLeads();
                          }
                        }}
                        placeholder="Add note for this booking..."
                        className="flex-1 px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Unconverted Contacts Section */}
          <div className="border-t border-neutral-800 pt-8 mt-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <Layers className="w-5 h-5 text-amber-400" />
                <span>Unconverted Contacts</span>
              </h3>
              <button
                onClick={async () => {
                  const contacts = await DatabaseService.getUnconvertedContacts();
                  setUnconvertedContacts(contacts);
                }}
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
              >
                <RefreshCw className="w-3 h-3 inline mr-1" />
                Refresh
              </button>
            </div>

            {unconvertedContacts.length === 0 ? (
              <div className="glass-panel rounded-2xl p-8 text-center text-neutral-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-neutral-700" />
                <p className="text-xs font-semibold">No unconverted contacts</p>
                <p className="text-[10px]">Log unconverted contacts from the Lead Intake panel.</p>
                <button
                  onClick={async () => {
                    const contacts = await DatabaseService.getUnconvertedContacts();
                    setUnconvertedContacts(contacts);
                  }}
                  className="mt-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Load Unconverted Contacts
                </button>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl overflow-hidden border border-neutral-800 divide-y divide-neutral-850">
                {unconvertedContacts.map((contact) => (
                  <div key={contact.id} className="p-4 hover:bg-neutral-900/10 transition flex flex-col md:flex-row md:items-center md:justify-between space-y-3 md:space-y-0">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-white text-xs">{contact.name || 'Unknown'}</span>
                        {contact.phone && <span className="text-[10px] font-mono text-neutral-400">{contact.phone}</span>}
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-[9px] font-bold px-1.5 py-0.5 rounded">{contact.entity}</span>
                        <span className="bg-neutral-950 border border-neutral-800 text-neutral-400 text-[9px] font-bold px-1.5 py-0.5 rounded">{contact.platform}</span>
                        <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[9px] font-bold px-1.5 py-0.5 rounded">{contact.reason}</span>
                      </div>
                      <p className="text-[9px] text-neutral-500 font-mono">Logged by {contact.loggedBy} · {new Date(contact.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {contact.convertedToLeadId ? (
                        <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Converted ✓</span>
                      ) : (
                        <button
                          onClick={async () => {
                            const name = contact.name || 'Unknown';
                            const phone = contact.phone || `no-phone-${contact.id}`;
                            const result = await DatabaseService.addLead(
                              {
                                name,
                                phone,
                                entity: contact.entity,
                                platform: contact.platform,
                                priority: 'Warm',
                                status: 'Pending Call Center',
                                inquiryNote: `Unconverted contact - ${contact.reason}`,
                                addedBy: currentUser.name,
                                assignedAgent: 'Unassigned',
                                followUpDue: null,
                                callCenterNote: '',
                                organizerNote: '',
                                organizerNoteUpdatedAt: null,
                                isBookedForAppointment: false,
                                commissionEligible: false,
                                attendanceStatus: 'Pending',
                              },
                              currentUser
                            );
                            if (result.success && result.lead) {
                              await DatabaseService.promoteUnconvertedToLead(contact.id, result.lead.id);
                              const contacts = await DatabaseService.getUnconvertedContacts();
                              setUnconvertedContacts(contacts);
                              await refreshLeads();
                            }
                          }}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer border border-emerald-500/10"
                        >
                          <UserPlus className="w-3 h-3 inline mr-1" />
                          Promote to Lead
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Team Members & Privileges Panel (Admin Only) */
        <div className="space-y-6 animate-fadeIn" id="team-management-view">
          
          <div className="flex justify-between items-center bg-neutral-950/40 border border-neutral-800 p-4 rounded-xl shadow-md">
            <div>
              <h3 className="text-base font-bold text-white flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <span>Authorized Team Roster</span>
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">Manage credentials, roles, and 4-digit security PIN access codes.</p>
            </div>
            
            {!isAddingUser && (
              <button
                onClick={openAddUserForm}
                className="flex items-center space-x-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer transition border border-emerald-500/10"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Register Team Member</span>
              </button>
            )}
          </div>

          {userSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-950/40 border border-emerald-800/80 p-4 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs font-semibold"
            >
              <Check className="w-4 h-4" />
              <span>{userSuccess}</span>
            </motion.div>
          )}

          {userError && (
            <div className="bg-rose-950/20 border border-rose-500/30 p-4 rounded-xl flex items-center space-x-2 text-rose-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4" />
              <span>{userError}</span>
            </div>
          )}

          {isAddingUser && (
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel p-6 rounded-2xl border border-neutral-800 bg-neutral-900/50 shadow-2xl space-y-6"
            >
              <div className="flex justify-between items-center border-b border-neutral-850 pb-3">
                <h4 className="text-sm font-bold text-white">
                  {editingUser ? `Edit ${editingUser.name}'s Authorized Info` : 'Register New Team Member Authorization'}
                </h4>
                <button
                  onClick={() => setIsAddingUser(false)}
                  className="p-1 hover:bg-neutral-800 text-neutral-500 hover:text-white rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUserFormSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">User Name</label>
                    <input
                      type="text"
                      required
                      value={userForm.name}
                      onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                      placeholder="e.g. Hanaa"
                      className="block w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Security PIN (4 digits)</label>
                    <input
                      type="text"
                      required
                      maxLength={4}
                      value={userForm.pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setUserForm({ ...userForm, pin: val });
                      }}
                      placeholder="e.g. 1234"
                      className="block w-full px-4 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs font-mono font-bold text-center tracking-widest"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Role Assignment</label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({ ...userForm, role: e.target.value as UserRole })}
                      className="block w-full px-3 py-2.5 bg-neutral-950 border border-neutral-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                    >
                      <option value="Admin">Admin (Hamdi - Full CRM Access)</option>
                      <option value="Organizer">Organizer (Weddan - Operations & Reports)</option>
                      <option value="Team Leader">Team Leader (Hanaa - Call Center supervisor)</option>
                      <option value="Call Center">Call Center (Omar/Eman - Active Agent Work)</option>
                      <option value="Moderator">Moderator (Amal/Menna - Inquiry Intake Only)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-neutral-500 font-bold uppercase tracking-wider mb-1.5">Profile Avatar Accent</label>
                    <div className="flex items-center space-x-3 pt-1">
                      {[
                        { class: 'bg-rose-600', name: 'Rose' },
                        { class: 'bg-amber-500', name: 'Amber' },
                        { class: 'bg-purple-600', name: 'Purple' },
                        { class: 'bg-blue-600', name: 'Blue' },
                        { class: 'bg-teal-600', name: 'Teal' },
                        { class: 'bg-emerald-600', name: 'Emerald' },
                        { class: 'bg-indigo-600', name: 'Indigo' }
                      ].map((color) => (
                        <button
                          key={color.class}
                          type="button"
                          onClick={() => setUserForm({ ...userForm, avatarColor: color.class })}
                          className={`w-7 h-7 rounded-full ${color.class} border-2 transition-all flex items-center justify-center cursor-pointer ${
                            userForm.avatarColor === color.class ? 'border-white scale-110 shadow-lg shadow-neutral-950' : 'border-transparent hover:scale-105'
                          }`}
                          title={color.name}
                        >
                          {userForm.avatarColor === color.class && <Check className="w-3.5 h-3.5 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 flex justify-end space-x-3 pt-4 border-t border-neutral-850">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-4 py-2 bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg border border-emerald-500/10 cursor-pointer transition-all"
                  >
                    {editingUser ? 'Save Updates' : 'Authorize Team Member'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Roster list */}
          <div className="glass-panel rounded-2xl shadow-xl overflow-hidden border border-neutral-800 divide-y divide-neutral-850">
            {teamUsers.map((u) => (
              <div key={u.pin} className="p-5 hover:bg-neutral-900/10 transition duration-150 flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full ${u.avatarColor} text-white flex items-center justify-center font-bold text-sm shadow-md`}>
                    {u.name.slice(0, 2)}
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white leading-tight flex items-center space-x-2">
                      <span>{u.name}</span>
                      {u.name === currentUser.name && (
                        <span className="bg-emerald-500/10 text-emerald-400 text-[9px] px-1.5 py-0.2 rounded border border-emerald-500/20 font-mono">YOU</span>
                      )}
                    </h4>
                    <p className="text-[11px] font-semibold text-neutral-400 mt-0.5">Role: <span className="font-bold text-emerald-400">{u.role}</span></p>
                  </div>
                </div>

                <div className="flex flex-col md:items-end space-y-2">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] text-neutral-500 font-bold uppercase font-mono">PIN ACCESS CODE:</span>
                      <span className="bg-neutral-950 text-neutral-200 border border-neutral-800 px-2.5 py-0.5 rounded text-xs font-mono font-bold tracking-widest select-all">{u.pin}</span>
                    </div>

                    <div className="flex items-center space-x-1.5 border-l border-neutral-800 pl-4">
                      <button
                        onClick={() => openEditUserForm(u)}
                        className="p-1.5 bg-neutral-950 hover:bg-neutral-850 text-neutral-400 hover:text-white rounded-lg border border-neutral-800 hover:border-neutral-700 transition"
                        title="Edit Info"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.pin)}
                        disabled={u.name === currentUser.name}
                        className="p-1.5 bg-neutral-950 hover:bg-rose-950/20 text-neutral-400 hover:text-rose-400 rounded-lg border border-neutral-800 hover:border-rose-900/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Revoke Pin Authorization"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-start md:justify-end">
                    {getUserPermissions(u.role).map((perm) => {
                      const labels: Record<string, string> = {
                        intake: 'Inquiry Intake',
                        monitor: 'Live Monitor',
                        callcenter: 'Call Center console',
                        organizer: 'Organizer console',
                      };
                      return (
                        <span key={perm} className="bg-neutral-950/50 border border-neutral-850/60 text-neutral-400 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider font-mono">
                          {labels[perm] || perm}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
