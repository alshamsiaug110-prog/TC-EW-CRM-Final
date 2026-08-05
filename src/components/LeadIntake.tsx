import React, { useState } from 'react';
import { DatabaseService, normalizePhone } from '../services/db';
import { Lead, LeadEntity, LeadPlatform, LeadPriority, LeadStatus, SystemUser, UnconvertedContact } from '../types';
import { User, Phone, CheckCircle, AlertTriangle, Calendar, Star, Send, Layers, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LeadIntakeProps {
  currentUser: SystemUser;
  onLeadAdded?: () => void;
}

export default function LeadIntake({ currentUser, onLeadAdded }: LeadIntakeProps) {
  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [entity, setEntity] = useState<LeadEntity>('Eye World');
  const [platform, setPlatform] = useState<LeadPlatform>('WhatsApp');
  const [priority, setPriority] = useState<LeadPriority>('Warm');
  const [inquiryNote, setInquiryNote] = useState('');
  const [isBooked, setIsBooked] = useState(false);
  const [commissionEligible, setCommissionEligible] = useState(false);

  // Status & Feedback States
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<Lead | null>(null);
  const [checkingDuplicate, setCheckingDuplicate] = useState(false);

  // Unconverted contact form state
  const [showUnconvertedForm, setShowUnconvertedForm] = useState(false);
  const [ucEntity, setUcEntity] = useState<LeadEntity>('Eye World');
  const [ucPlatform, setUcPlatform] = useState<LeadPlatform>('WhatsApp');
  const [ucReason, setUcReason] = useState<string>('');
  const [ucName, setUcName] = useState('');
  const [ucPhone, setUcPhone] = useState('');
  const [ucSuccessMsg, setUcSuccessMsg] = useState<string | null>(null);
  const [ucErrorMsg, setUcErrorMsg] = useState<string | null>(null);

  // Recent leads entered this session
  const [sessionLeads, setSessionLeads] = useState<Lead[]>([]);

  // Duplicate lead edit state
  const [duplicateLeadToEdit, setDuplicateLeadToEdit] = useState<Lead | null>(null);
  const [duplicateEditNote, setDuplicateEditNote] = useState('');
  const [isUpdatingDuplicate, setIsUpdatingDuplicate] = useState(false);

  // Global Search state
  const [globalSearchName, setGlobalSearchName] = useState('');
  const [globalSearchPhone, setGlobalSearchPhone] = useState('');
  const [globalSearchResult, setGlobalSearchResult] = useState<{ resultType: 'lead' | 'unconverted'; data: any } | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  // UC duplicate warning state
  const [ucDuplicateWarning, setUcDuplicateWarning] = useState<{ resultType: 'lead' | 'unconverted'; data: any } | null>(null);
  const [checkingUcDuplicate, setCheckingUcDuplicate] = useState(false);

  // Phone live normalization preview
  const normalizedPhonePreview = phone ? normalizePhone(phone) : '';

  // Live query to detect duplicates in background
  React.useEffect(() => {
    const normalized = phone ? normalizePhone(phone) : '';
    if (!normalized || normalized.length < 8) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingDuplicate(true);
      try {
        const result = await DatabaseService.checkPhoneDuplicate(normalized);
        if (result.exists && result.lead) {
          setDuplicateWarning(result.lead);
        } else {
          setDuplicateWarning(null);
        }
      } catch (e) {
        console.error('Error checking duplicates:', e);
      } finally {
        setCheckingDuplicate(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [phone]);

  // Global search effect
  React.useEffect(() => {
    const query = globalSearchPhone || globalSearchName;
    const type = globalSearchPhone ? 'phone' : 'name';
    
    if (!query || query.trim().length < 3) {
      setGlobalSearchResult(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingGlobal(true);
      try {
        const result = await DatabaseService.checkDuplicate(query, type);
        if (result.exists) {
          setGlobalSearchResult({ resultType: result.resultType as 'lead'|'unconverted', data: result.data });
        } else {
          setGlobalSearchResult(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsSearchingGlobal(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [globalSearchName, globalSearchPhone]);

  // UC duplicate warning effect
  React.useEffect(() => {
    const query = ucPhone || ucName;
    const type = ucPhone ? 'phone' : 'name';
    
    if (!query || query.trim().length < 3) {
      setUcDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      setCheckingUcDuplicate(true);
      try {
        const result = await DatabaseService.checkDuplicate(query, type);
        if (result.exists) {
          setUcDuplicateWarning({ resultType: result.resultType as 'lead'|'unconverted', data: result.data });
        } else {
          setUcDuplicateWarning(null);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setCheckingUcDuplicate(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [ucName, ucPhone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(null);
    setDuplicateError(null);
    setGeneralError(null);

    if (!name.trim()) return;
    if (!phone.trim()) return;

    // Call service to add lead
    const result = await DatabaseService.addLead(
      {
        name: name.trim(),
        phone: phone.trim(),
        entity,
        platform,
        priority,
        status: isBooked ? 'Booked/Confirmed' : 'Pending Call Center',
        inquiryNote: inquiryNote.trim(),
        addedBy: currentUser.name,
        assignedAgent: 'Unassigned',
        followUpDue: null,
        callCenterNote: '',
        organizerNote: '',
        organizerNoteUpdatedAt: null,
        isBookedForAppointment: isBooked,
        commissionEligible: commissionEligible,
        attendanceStatus: 'Pending',
      },
      currentUser
    );

    if (result.success && result.lead) {
      setSuccessMsg(`Lead "${result.lead.name}" successfully recorded with phone ${result.lead.phone}!`);
      setSessionLeads([result.lead, ...sessionLeads]);
      
      // Reset form
      setName('');
      setPhone('');
      setInquiryNote('');
      setIsBooked(false);
      setCommissionEligible(false);
      
      if (onLeadAdded) {
        onLeadAdded();
      }
    } else {
      const errorMsg = result.error || 'Failed to submit lead entry.';
      if (errorMsg.toLowerCase().includes('duplicate') || errorMsg.toLowerCase().includes('already exists')) {
        setDuplicateError(errorMsg);
        if (result.duplicateLead) {
          setDuplicateLeadToEdit(result.duplicateLead);
          setDuplicateEditNote('');
        }
      } else {
        setGeneralError(errorMsg);
      }
    }
  };

  const handleUpdateDuplicate = async () => {
    if (!duplicateLeadToEdit || !duplicateEditNote.trim()) return;
    setIsUpdatingDuplicate(true);
    setGeneralError(null);
    
    const updatePrefix = `[Update by ${currentUser.name} on ${new Date().toLocaleDateString()}] `;
    const newNote = duplicateLeadToEdit.inquiryNote 
      ? duplicateLeadToEdit.inquiryNote + '\n\n' + updatePrefix + duplicateEditNote.trim()
      : updatePrefix + duplicateEditNote.trim();

    const res = await DatabaseService.updateLead(duplicateLeadToEdit.id, { inquiryNote: newNote }, currentUser);
    if (res.success) {
      setSuccessMsg(`Successfully appended update to existing lead "${duplicateLeadToEdit.name}".`);
      setDuplicateLeadToEdit(null);
      setDuplicateEditNote('');
      setDuplicateError(null);
      
      // Reset form
      setName('');
      setPhone('');
      setInquiryNote('');
    } else {
      setGeneralError(res.error || 'Failed to update lead.');
    }
    setIsUpdatingDuplicate(false);
  };

  const handleSubmitUnconverted = async () => {
    if (!ucReason) {
      setUcErrorMsg('Please select a reason for logging this unconverted contact.');
      return;
    }
    setUcSuccessMsg(null);
    setUcErrorMsg(null);

    try {
      const result = await DatabaseService.addUnconvertedContact({
        entity: ucEntity,
        platform: ucPlatform,
        reason: ucReason as any,
        name: ucName.trim() || null,
        phone: ucPhone.trim() || null,
        loggedBy: currentUser.name,
      });
      if (result.success) {
        setUcSuccessMsg('Unconverted contact logged successfully.');
        setUcEntity('Eye World');
        setUcPlatform('WhatsApp');
        setUcReason('');
        setUcName('');
        setUcPhone('');
        setTimeout(() => setUcSuccessMsg(null), 3000);
      } else {
        setUcErrorMsg(result.error || 'Failed to log contact.');
      }
    } catch (e: any) {
      setUcErrorMsg(e.message || 'Unexpected error logging contact.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center space-x-3">
          <Eye className="w-8 h-8 text-emerald-400" />
          <span>Lead Intake & Registration</span>
        </h1>
        <p className="mt-2 text-sm text-neutral-400 font-medium">
          Enter patient inquiries. The system normalizes Egyptian phone formats automatically and rejects duplicate entries.
        </p>
      </div>

      {/* Global Quick Search */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 shadow-sm">
        <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Quick Verify Lead</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            type="text"
            placeholder="Search by Name..."
            value={globalSearchName}
            onChange={(e) => {
              setGlobalSearchName(e.target.value);
              if (globalSearchPhone) setGlobalSearchPhone('');
            }}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:ring-1 focus:ring-emerald-500"
          />
          <input
            type="text"
            placeholder="Search by Phone..."
            value={globalSearchPhone}
            onChange={(e) => {
              setGlobalSearchPhone(e.target.value);
              if (globalSearchName) setGlobalSearchName('');
            }}
            className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2.5 text-sm text-white placeholder-neutral-600 focus:ring-1 focus:ring-emerald-500 font-mono"
          />
        </div>
        
        {isSearchingGlobal && (
          <p className="text-xs text-neutral-500 mt-3 animate-pulse">Searching database...</p>
        )}
        
        {!isSearchingGlobal && globalSearchResult && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`mt-4 p-4 border rounded-xl flex items-center justify-between ${
              globalSearchResult.resultType === 'unconverted' 
                ? 'bg-amber-500/10 border-amber-500/20' 
                : 'bg-emerald-500/10 border-emerald-500/20'
            }`}
          >
            <div className="text-sm">
              <span className={`font-bold uppercase tracking-wider text-xs block mb-1 ${globalSearchResult.resultType === 'unconverted' ? 'text-amber-400' : 'text-emerald-400'}`}>
                {globalSearchResult.resultType === 'unconverted' ? 'Unconverted Contact Found' : 'Lead Found'}
              </span>
              <strong className="text-white text-base">{globalSearchResult.data.name || 'No Name'}</strong>
              <span className="text-neutral-500 mx-2">|</span>
              {globalSearchResult.data.phone ? (
                <span className={`${globalSearchResult.resultType === 'unconverted' ? 'text-amber-400' : 'text-emerald-400'} font-mono`}>{globalSearchResult.data.phone}</span>
              ) : (
                <span className="text-neutral-400 italic text-xs">No Phone Number</span>
              )}
              {globalSearchResult.resultType === 'unconverted' && (
                <div className="text-xs text-neutral-400 mt-1">
                  Platform: <span className="text-amber-300 font-semibold">{globalSearchResult.data.platform}</span> • 
                  Logged: {new Date(globalSearchResult.data.createdAt).toLocaleDateString()}
                </div>
              )}
            </div>
            {globalSearchResult.resultType === 'unconverted' ? (
              <button
                onClick={() => {
                  setName(globalSearchResult.data.name || '');
                  setEntity(globalSearchResult.data.entity as LeadEntity);
                  setPlatform(globalSearchResult.data.platform as LeadPlatform);
                  setPhone('');
                  setGlobalSearchResult(null);
                  setGlobalSearchName('');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="text-sm font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-md"
              >
                <Layers className="w-4 h-4" />
                <span>Convert to Lead</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setDuplicateLeadToEdit(globalSearchResult.data);
                  setDuplicateEditNote('');
                }}
                className="text-sm font-bold bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 shadow-md"
              >
                <Eye className="w-4 h-4" />
                <span>Open Lead Page</span>
              </button>
            )}
          </motion.div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Panel */}
        <div className="lg:col-span-2 glass-panel rounded-2xl p-6 sm:p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-lg font-bold text-white border-b border-neutral-800 pb-3">
              New Inquiry Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Patient Name */}
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Patient Full Name *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ahmed Mohamed Ali"
                    className="block w-full pl-11 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:bg-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all text-sm font-medium text-white placeholder:text-neutral-600"
                  />
                </div>
              </div>

              {/* Phone Input */}
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-1">Mobile Phone Number *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-neutral-500">
                    <Phone className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (duplicateError) setDuplicateError(null);
                      if (generalError) setGeneralError(null);
                    }}
                    placeholder="+20 100 987 6543 or 0100..."
                    className="block w-full pl-11 pr-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:bg-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all text-sm font-mono text-white font-bold"
                  />
                </div>
                {/* Live Normalization Assist */}
                {normalizedPhonePreview && (
                  <div className="mt-1.5 flex items-center space-x-1.5 text-xs text-neutral-400 font-mono">
                    <span className="font-semibold text-neutral-500">Stored as:</span>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">{normalizedPhonePreview}</span>
                  </div>
                )}

                {/* Non-blocking Duplicate UI Warning */}
                {duplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-2.5 p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start space-x-2.5 text-xs text-amber-200 shadow-md shadow-amber-950/20"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-300">Duplicate Registered Lead</p>
                      <p className="leading-relaxed font-medium">
                        This phone number is already registered to <span className="text-white font-bold underline decoration-amber-400/50 decoration-2">"{duplicateWarning.name}"</span>.
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] text-neutral-400 pt-1">
                        <span>Status: <strong className="text-amber-400">{duplicateWarning.status}</strong></span>
                        <span>•</span>
                        <span>Added by: <strong className="text-neutral-300">{duplicateWarning.addedBy}</strong></span>
                      </div>
                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDuplicateLeadToEdit(duplicateWarning);
                            setDuplicateEditNote('');
                          }}
                          className="text-xs font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 px-3 py-1.5 rounded transition-colors shadow-sm inline-flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Open Lead & Add Note</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Entity/Brand Selection */}
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Clinic Entity *</label>
                <select
                  value={entity}
                  onChange={(e) => setEntity(e.target.value as LeadEntity)}
                  className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:bg-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm font-semibold text-neutral-200"
                >
                  <option value="Eye World">Eye World Clinic</option>
                  <option value="Dr. Ihab">Dr. Ihab Clinic</option>
                  <option value="Top Care">Top Care Clinic</option>
                </select>
              </div>

              {/* Platform / Channel */}
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Platform Channel *</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as LeadPlatform)}
                  className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:bg-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-sm font-semibold text-neutral-200"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Instagram">Instagram</option>
                  <option value="Facebook">Facebook</option>
                  <option value="TikTok">TikTok</option>
                  <option value="Referral">Referral</option>
                  <option value="Other">Other Channel</option>
                </select>
              </div>

              {/* Priority Category */}
              <div>
                <label className="block text-sm font-semibold text-neutral-300 mb-2">Priority Level</label>
                <div className="flex bg-neutral-950 border border-neutral-800 p-1 rounded-xl">
                  {(['Hot', 'Warm', 'Cold'] as LeadPriority[]).map((p) => {
                    const active = priority === p;
                    const colors = {
                      Hot: 'bg-rose-500/20 text-rose-300 border border-rose-500/30 shadow-md',
                      Warm: 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-md',
                      Cold: 'bg-neutral-800 text-neutral-300 border border-neutral-700 shadow-md'
                    };
                    return (
                      <button
                        type="button"
                        key={p}
                        onClick={() => setPriority(p)}
                        className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all border border-transparent ${
                          active ? colors[p] : 'text-neutral-500 hover:text-neutral-300'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Inquiry notes / details */}
            <div>
              <label className="block text-sm font-semibold text-neutral-300 mb-2">Inquiry / Patient Request Notes *</label>
              <textarea
                required
                rows={4}
                value={inquiryNote}
                onChange={(e) => setInquiryNote(e.target.value)}
                placeholder="Write down patient needs (e.g., Lasik diagnostic test, specific dry eyes inquiries, booking slots request, etc.)"
                className="block w-full px-4 py-3 bg-neutral-950 border border-neutral-800 rounded-xl focus:bg-black focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-all text-sm font-medium text-white placeholder:text-neutral-600 leading-relaxed"
              />
            </div>

            {/* Booking Toggle Option */}
            <div className="bg-emerald-500/5 rounded-xl p-4 border border-emerald-500/15 flex items-center justify-between">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-white">Booking Reservation Toggle</h4>
                  <p className="text-xs text-neutral-400">Does this patient want to lock/confirm an immediate appointment booking?</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isBooked}
                  onChange={(e) => setIsBooked(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            {/* "With Booking" Toggle (commissionEligible) - Admin/Moderator Only */}
            {(currentUser.role === 'Admin' || currentUser.role === 'Moderator') && (
              <div className="bg-blue-500/5 rounded-xl p-4 border border-blue-500/15 flex items-center justify-between">
                <div className="flex items-start space-x-3">
                  <Layers className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-white">With Booking</h4>
                    <p className="text-xs text-neutral-400">Is this lead eligible for commission ("With Booking")? (Moderator/Admin only)</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-xs font-semibold text-neutral-400">{commissionEligible ? 'Yes' : 'No'}</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={commissionEligible}
                      onChange={(e) => setCommissionEligible(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-neutral-700 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            )}

            {/* Error and Success Notifications */}
            <AnimatePresence mode="wait">
              {duplicateError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-950/25 border-l-4 border-rose-500 p-4 rounded-xl flex items-start space-x-3 shadow-md border border-rose-500/15"
                >
                  <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-200">Duplicate Phone Detected</h4>
                    <p className="text-xs text-rose-300 mt-1 font-medium">{duplicateError}</p>
                  </div>
                </motion.div>
              )}

              {generalError && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-rose-950/25 border-l-4 border-rose-500 p-4 rounded-xl flex items-start space-x-3 shadow-md border border-rose-500/15"
                >
                  <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-rose-200">Submission Failed</h4>
                    <p className="text-xs text-rose-300 mt-1 font-medium">{generalError}</p>
                  </div>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-emerald-950/25 border-l-4 border-emerald-500 p-4 rounded-xl flex items-start space-x-3 shadow-md border border-emerald-500/15"
                >
                  <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-200">Submission Recorded Successfully</h4>
                    <p className="text-xs text-emerald-300 mt-1 font-medium">{successMsg}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Duplicate Lead Editor Modal */}
            {duplicateLeadToEdit && (
              <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-950/40">
                    <div className="flex items-center space-x-2.5">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono">Duplicate Lead Detected</h3>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setDuplicateLeadToEdit(null)}
                      className="text-neutral-500 hover:text-white transition-colors p-1"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="p-6 space-y-5">
                    <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                      <p className="text-sm text-amber-400 font-medium">
                        This phone number is already registered to <strong>{duplicateLeadToEdit.name}</strong>. 
                        Instead of creating a new lead, you can review their history below and append a new note.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                        <span className="text-xs text-neutral-500 block mb-1 uppercase font-mono">Entity</span>
                        <span className="font-semibold text-white">{duplicateLeadToEdit.entity}</span>
                      </div>
                      <div className="bg-neutral-950 rounded-lg p-3 border border-neutral-800/50">
                        <span className="text-xs text-neutral-500 block mb-1 uppercase font-mono">Current Status</span>
                        <span className="font-semibold text-white">{duplicateLeadToEdit.status}</span>
                      </div>
                    </div>
                    
                    {duplicateLeadToEdit.inquiryNote && (
                      <div className="bg-neutral-950 rounded-lg p-4 border border-neutral-800/50">
                        <h4 className="text-xs font-bold text-neutral-400 mb-2 uppercase tracking-wider">Previous Inquiry Notes</h4>
                        <p className="text-sm text-neutral-300 whitespace-pre-wrap">{duplicateLeadToEdit.inquiryNote}</p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-white mb-2">Append New Update / Note</label>
                      <textarea
                        className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all min-h-[120px]"
                        placeholder="Type the latest interaction or request from the patient here..."
                        value={duplicateEditNote}
                        onChange={(e) => setDuplicateEditNote(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-neutral-950/40 border-t border-neutral-800 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setDuplicateLeadToEdit(null)}
                      className="px-5 py-2.5 rounded-lg text-sm font-bold text-neutral-400 hover:text-white transition-colors"
                      disabled={isUpdatingDuplicate}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateDuplicate}
                      disabled={!duplicateEditNote.trim() || isUpdatingDuplicate}
                      className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-lg transition-colors flex items-center space-x-2 shadow-lg shadow-emerald-500/20"
                    >
                      {isUpdatingDuplicate ? (
                        <span>Updating...</span>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Append Note & Save</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-6 py-3.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-semibold text-sm flex items-center space-x-2 shadow-lg shadow-emerald-950/45 transition-all cursor-pointer border border-emerald-500/10"
              >
                <Send className="w-4 h-4" />
                <span>Submit Lead Entry</span>
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar / Logs Panel */}
        <div className="glass-panel rounded-2xl p-6 text-white space-y-6 flex flex-col justify-between shadow-xl">
          <div className="space-y-6">
            <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider flex items-center justify-between">
              <span>Moderator Logs</span>
              <span className="bg-neutral-850 text-emerald-400 text-[10px] px-2 py-0.5 rounded border border-neutral-800 font-mono font-medium">Session Logs</span>
            </h3>

            {sessionLeads.length === 0 ? (
              <div className="border border-dashed border-neutral-800 rounded-xl p-8 text-center text-neutral-500 space-y-2">
                <Layers className="w-8 h-8 mx-auto text-neutral-600" />
                <p className="text-xs font-semibold">No entries logged yet</p>
                <p className="text-[10px] text-neutral-600">Leads added this session will appear here instantly for rapid auditing</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {sessionLeads.map((l) => (
                  <motion.div
                    key={l.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-3 bg-neutral-950/40 border border-neutral-850 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-white truncate max-w-[120px]">{l.name}</span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                        l.priority === 'Hot' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                        l.priority === 'Warm' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        'bg-neutral-800 text-neutral-400 border-neutral-700'
                      }`}>
                        {l.priority}
                      </span>
                    </div>
                    <p className="font-mono text-neutral-400 text-[10px]">{l.phone}</p>
                    <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1.5 border-t border-neutral-900 mt-1.5">
                      <span className="font-semibold text-emerald-400">{l.entity}</span>
                      <span className="text-neutral-400 font-mono text-[9px]">{new Date(l.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Unconverted Contact Button */}
          <button
            onClick={() => setShowUnconvertedForm(!showUnconvertedForm)}
            className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            {showUnconvertedForm ? '− Close Unconverted Contact Form' : '+ Log Unconverted Contact'}
          </button>

          {/* Unconverted Contact Form */}
          {showUnconvertedForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-neutral-950/40 border border-neutral-850 rounded-xl p-4 space-y-4"
            >
              <h4 className="text-xs font-bold text-neutral-300">Log Unconverted Contact</h4>
              <p className="text-[10px] text-neutral-500">Track contacts that could not be converted. Name and phone are optional.</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Entity</label>
                  <select
                    value={ucEntity}
                    onChange={(e) => setUcEntity(e.target.value as LeadEntity)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Eye World">Eye World Clinic</option>
                    <option value="Dr. Ihab">Dr. Ihab Clinic</option>
                    <option value="Top Care">Top Care Clinic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Channel</label>
                  <select
                    value={ucPlatform}
                    onChange={(e) => setUcPlatform(e.target.value as LeadPlatform)}
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-neutral-300 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Facebook">Facebook</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Referral">Referral</option>
                    <option value="Other">Other Channel</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Reason *</label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {['No phone provided', 'No name provided', 'Went silent', 'Spam/irrelevant', 'Other'].map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => { setUcReason(r); setUcErrorMsg(null); }}
                        className={`text-left px-3 py-1.5 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                          ucReason === r
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-200'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:bg-neutral-900'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Name (optional)</label>
                  <input
                    type="text"
                    value={ucName}
                    onChange={(e) => setUcName(e.target.value)}
                    placeholder="Leave blank if not provided"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-neutral-400 mb-1">Phone (optional)</label>
                  <input
                    type="text"
                    value={ucPhone}
                    onChange={(e) => setUcPhone(e.target.value)}
                    placeholder="Leave blank if not provided"
                    className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                {ucDuplicateWarning && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg flex items-start space-x-2 text-xs text-amber-200"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 flex-shrink-0 animate-pulse" />
                    <div className="space-y-1">
                      <p className="font-bold text-amber-300">
                        {ucDuplicateWarning.resultType === 'unconverted' ? 'Unconverted Contact Found' : 'Duplicate Lead Found'}
                      </p>
                      <p className="leading-relaxed font-medium">
                        This contact is already in the system: <span className="text-white font-bold">{ucDuplicateWarning.data.name || 'Unknown Name'}</span>.
                      </p>
                      {ucDuplicateWarning.resultType === 'unconverted' && (
                        <p className="text-[10px] text-amber-400/80 mt-0.5">
                          Platform: <span className="font-bold text-amber-300">{ucDuplicateWarning.data.platform}</span> • Logged: {new Date(ucDuplicateWarning.data.createdAt).toLocaleDateString()}
                        </p>
                      )}
                      <div className="pt-2">
                        {ucDuplicateWarning.resultType === 'unconverted' ? (
                          <button
                            type="button"
                            onClick={() => {
                              setName(ucDuplicateWarning.data.name || '');
                              setEntity(ucDuplicateWarning.data.entity as LeadEntity);
                              setPlatform(ucDuplicateWarning.data.platform as LeadPlatform);
                              setPhone('');
                              setUcDuplicateWarning(null);
                              setShowUnconvertedForm(false);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 px-2.5 py-1.5 rounded transition-colors shadow-sm inline-flex items-center space-x-1"
                          >
                            <Layers className="w-3 h-3" />
                            <span>Convert to Lead</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setDuplicateLeadToEdit(ucDuplicateWarning.data);
                              setDuplicateEditNote('');
                            }}
                            className="text-[10px] font-bold bg-amber-500 hover:bg-amber-600 text-neutral-950 px-2.5 py-1.5 rounded transition-colors shadow-sm inline-flex items-center space-x-1"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Open Lead Page</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}

                {ucErrorMsg && (
                  <div className="text-[10px] text-rose-400 font-semibold">{ucErrorMsg}</div>
                )}

                {ucSuccessMsg && (
                  <div className="text-[10px] text-emerald-400 font-semibold">{ucSuccessMsg}</div>
                )}

                <button
                  onClick={handleSubmitUnconverted}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
                >
                  Log Contact
                </button>
              </div>
            </motion.div>
          )}

          <div className="bg-neutral-950/30 p-4 rounded-xl border border-neutral-900/60 text-xs text-neutral-400 leading-relaxed">
            <h4 className="text-neutral-300 font-bold mb-1.5 flex items-center space-x-1.5">
              <Star className="w-3.5 h-3.5 text-amber-400" />
              <span>Normalization Standard</span>
            </h4>
            <p>Our database automatically converts local Egyptian mobile formats starting with <span className="font-mono font-bold text-neutral-200">+20</span> to standard internal <span className="font-mono font-bold text-neutral-200">0</span> formatting for consistent records.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
