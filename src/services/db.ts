import { Lead, TeamMessage, AuditLog, LeadStatus, LeadEntity, LeadPlatform, LeadPriority, UserRole, SystemUser, SYSTEM_USERS, UnconvertedContact } from '../types';
import { supabase } from '../lib/supabase';

// Phone normalization: converts +20XXXXXXXXXX to 0XXXXXXXXXX
export function normalizePhone(phone: string): string {
  let cleaned = phone.trim().replace(/\s+/g, '');
  
  if (cleaned.startsWith('+20')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (cleaned.startsWith('20') && cleaned.length > 10) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('0020')) {
    cleaned = '0' + cleaned.substring(4);
  }
  
  // Keep only digits
  cleaned = cleaned.replace(/\D/g, '');
  
  // Ensure it starts with '0'
  if (cleaned && !cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

const STORAGE_KEYS = {
  LEADS: 'eyeworld_leads',
  MESSAGES: 'eyeworld_messages',
  LOGS: 'eyeworld_logs',
  USERS: 'eyeworld_users',
};

// Seeding realistic dummy data to make the app immediate, rich, and responsive
const SEED_LEADS = (): Lead[] => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(now.getDate() - 3);
  const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];

  return [
    {
      id: 'lead-1',
      name: 'Ahmed Mansour',
      phone: '01012345678',
      entity: 'Dr. Ihab',
      platform: 'WhatsApp',
      priority: 'Hot',
      status: 'Pending Call Center',
      inquiryNote: 'Inquiring about laser vision correction surgery costs and booking slot.',
      addedBy: 'Amal',
      assignedAgent: 'Omar',
      followUpDue: todayStr,
      callCenterNote: '',
      organizerNote: 'Patient wants Dr. Ihab specifically. High priority.',
      organizerNoteUpdatedAt: now.toISOString(),
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
      updatedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      isBookedForAppointment: false,
      commissionEligible: false,
      attendanceStatus: 'Pending',
      statusHistory: [
        { status: 'Pending Call Center', changedBy: 'Amal', changedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(), notes: 'Lead added' }
      ],
      callLogs: []
    },
    {
      id: 'lead-2',
      name: 'Sarah El-Shenawy',
      phone: '01223456789',
      entity: 'Eye World',
      platform: 'Instagram',
      priority: 'Warm',
      status: 'Under Follow-Up',
      inquiryNote: 'Sent screenshot of eye treatment post, wants price list.',
      addedBy: 'Menna',
      assignedAgent: 'Eman',
      followUpDue: todayStr,
      callCenterNote: 'Spoke to her. She is traveling and asked to follow up in the afternoon.',
      organizerNote: 'Make sure we send the new pricing brochure.',
      organizerNoteUpdatedAt: now.toISOString(),
      createdAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
      updatedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
      isBookedForAppointment: false,
      commissionEligible: false,
      attendanceStatus: 'Pending',
      statusHistory: [
        { status: 'Pending Call Center', changedBy: 'Menna', changedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(), notes: 'Lead added' },
        { status: 'Under Follow-Up', changedBy: 'Eman', changedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(), notes: 'Spoke with client, deferred call.' }
      ],
      callLogs: [
        {
          id: 'log-1',
          loggedBy: 'Eman',
          loggedAt: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString(),
          note: 'Spoke with her. Requested follow up after her flight.',
          statusAfterCall: 'Under Follow-Up',
          followUpDue: todayStr
        }
      ]
    },
    {
      id: 'lead-3',
      name: 'Mahmoud Al-Masry',
      phone: '01114567890',
      entity: 'Top Care',
      platform: 'Facebook',
      priority: 'Cold',
      status: 'Booked/Confirmed',
      inquiryNote: 'Needs pediatric eye exam for his son.',
      addedBy: 'Amal',
      assignedAgent: 'Omar',
      followUpDue: null,
      callCenterNote: 'Appointment confirmed for Monday 5 PM.',
      organizerNote: 'VIP client relative. Ensure smooth welcome.',
      organizerNoteUpdatedAt: yesterday.toISOString(),
      createdAt: new Date(yesterday.getTime() - 10 * 60 * 60 * 1000).toISOString(), // Yesterday
      updatedAt: new Date(yesterday.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      isBookedForAppointment: true,
      commissionEligible: false,
      attendanceStatus: 'Pending',
      statusHistory: [
        { status: 'Pending Call Center', changedBy: 'Amal', changedAt: new Date(yesterday.getTime() - 10 * 60 * 60 * 1000).toISOString() },
        { status: 'Under Follow-Up', changedBy: 'Omar', changedAt: new Date(yesterday.getTime() - 9 * 60 * 60 * 1000).toISOString() },
        { status: 'Booked/Confirmed', changedBy: 'Omar', changedAt: new Date(yesterday.getTime() - 8 * 60 * 60 * 1000).toISOString(), notes: 'Booked for Monday 5 PM' }
      ],
      callLogs: [
        {
          id: 'log-2',
          loggedBy: 'Omar',
          loggedAt: new Date(yesterday.getTime() - 8 * 60 * 60 * 1000).toISOString(),
          note: 'Confirmed booking for Mon 5 PM. Marked booking toggle.',
          statusAfterCall: 'Booked/Confirmed',
          followUpDue: null
        }
      ]
    },
    {
      id: 'lead-4',
      name: 'Yasmine Fahmy',
      phone: '01556789012',
      entity: 'Dr. Ihab',
      platform: 'WhatsApp',
      priority: 'Hot',
      status: 'Pending Call Center',
      inquiryNote: 'Severe dry eye patient seeking custom medical plan.',
      addedBy: 'Menna',
      assignedAgent: 'Unassigned',
      followUpDue: yesterdayStr,
      callCenterNote: '',
      organizerNote: '',
      organizerNoteUpdatedAt: null,
      createdAt: new Date(yesterday.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(yesterday.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      isBookedForAppointment: false,
      commissionEligible: false,
      attendanceStatus: 'Pending',
      statusHistory: [
        { status: 'Pending Call Center', changedBy: 'Menna', changedAt: new Date(yesterday.getTime() - 2 * 60 * 60 * 1000).toISOString() }
      ],
      callLogs: []
    },
    {
      id: 'lead-5',
      name: 'Mostafa Kamel',
      phone: '01009876543',
      entity: 'Eye World',
      platform: 'TikTok',
      priority: 'Cold',
      status: 'Canceled',
      inquiryNote: 'Inquired about glasses frame availability.',
      addedBy: 'Amal',
      assignedAgent: 'Eman',
      followUpDue: null,
      callCenterNote: 'Wrong number or not interested in clinic treatment.',
      organizerNote: 'Spam/wrong inquiry.',
      organizerNoteUpdatedAt: threeDaysAgo.toISOString(),
      createdAt: new Date(threeDaysAgo.getTime() - 5 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(threeDaysAgo.getTime() - 4 * 60 * 60 * 1000).toISOString(),
      isBookedForAppointment: false,
      commissionEligible: false,
      attendanceStatus: 'Pending',
      statusHistory: [
        { status: 'Pending Call Center', changedBy: 'Amal', changedAt: new Date(threeDaysAgo.getTime() - 5 * 60 * 60 * 1000).toISOString() },
        { status: 'Canceled', changedBy: 'Eman', changedAt: new Date(threeDaysAgo.getTime() - 4 * 60 * 60 * 1000).toISOString(), notes: 'No interest' }
      ],
      callLogs: [
        {
          id: 'log-3',
          loggedBy: 'Eman',
          loggedAt: new Date(threeDaysAgo.getTime() - 4 * 60 * 60 * 1000).toISOString(),
          note: 'Stated he was only asking about glass frames, not laser clinic treatments.',
          statusAfterCall: 'Canceled',
          followUpDue: null
        }
      ]
    }
  ];
};

const SEED_MESSAGES = (): TeamMessage[] => {
  const now = new Date();
  
  const fourDaysAgo = new Date();
  fourDaysAgo.setDate(now.getDate() - 4);

  // Older message (7 days old, designed to be auto-deleted!)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);

  return [
    {
      id: 'msg-old',
      senderName: 'Weddan',
      senderRole: 'Organizer',
      recipientRole: 'All',
      content: 'This is an old message that will show up as cleaned up if retention runs.',
      timestamp: sevenDaysAgo.toISOString(),
      isRead: false,
      readBy: [],
      threadId: null,
      expiresAt: new Date(sevenDaysAgo.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-1',
      senderName: 'Weddan',
      senderRole: 'Organizer',
      recipientRole: 'Moderators',
      content: 'Please make sure all new Facebook leads have correct phone numbers before assigning.',
      timestamp: fourDaysAgo.toISOString(),
      isRead: false,
      readBy: ['Amal'],
      threadId: null,
      expiresAt: new Date(fourDaysAgo.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
    },
    {
      id: 'msg-2',
      senderName: 'Weddan',
      senderRole: 'Organizer',
      recipientRole: 'All',
      content: 'Excellent job Call Center team on yesterday’s bookings! Let’s keep up the momentum.',
      timestamp: new Date(now.getTime() - 5 * 60 * 1000).toISOString(), // 5 mins ago
      isRead: false,
      readBy: [],
      threadId: null,
      expiresAt: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];
};

const SEED_LOGS = (): AuditLog[] => {
  const now = new Date();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);

  return [
    {
      id: 'log-id-1',
      timestamp: new Date(yesterday.getTime() - 10 * 60 * 60 * 1000).toISOString(),
      user: 'Amal',
      role: 'Moderator',
      category: 'Moderator',
      action: 'Lead Intake',
      details: 'Added lead Mahmoud Al-Masry (+201114567890 normalized to 01114567890).'
    },
    {
      id: 'log-id-2',
      timestamp: new Date(yesterday.getTime() - 8 * 60 * 60 * 1000).toISOString(),
      user: 'Omar',
      role: 'Call Center',
      category: 'Call Center',
      action: 'Status Change',
      details: 'Updated Mahmoud Al-Masry status to Booked/Confirmed. Logged booking.'
    },
    {
      id: 'log-id-3',
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
      user: 'Amal',
      role: 'Moderator',
      category: 'Moderator',
      action: 'Lead Intake',
      details: 'Added lead Ahmed Mansour (01012345678).'
    }
  ];
};

export const DatabaseService = {
  // Error tracking state for UI setup guidance
  _listeners: [] as ((err: string | null) => void)[],
  _lastError: null as string | null,
  subscribeToError(cb: (err: string | null) => void) {
    this._listeners.push(cb);
    cb(this._lastError);
    return () => {
      this._listeners = this._listeners.filter(l => l !== cb);
    };
  },
  setError(err: string | null) {
    if (this._lastError !== err) {
      this._lastError = err;
      this._listeners.forEach(l => l(err));
    }
  },

  // Leads Storage API
  async getLeads(): Promise<Lead[]> {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) {
        console.error('Supabase query error (leads):', error);
        this.setError(error.message);
        return [];
      }

      this.setError(null);
      const formattedLeads = (data || []).map((lead: any) => ({
        attendanceStatus: 'Pending',
        ...lead
      })) as Lead[];
      return formattedLeads;
    } catch (e: any) {
      console.error('Supabase connection error (leads):', e);
      this.setError(e.message || String(e));
      return [];
    }
  },

  async checkPhoneDuplicate(phone: string): Promise<{ exists: boolean; lead?: Lead }> {
    const normalized = normalizePhone(phone);
    if (!normalized) return { exists: false };
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('phone', normalized);

      if (error) {
        console.error('Check phone duplicate query error:', error);
        return { exists: false };
      }

      if (data && data.length > 0) {
        return { exists: true, lead: data[0] as Lead };
      }
    } catch (e) {
      console.error('Check phone duplicate exception:', e);
    }
    return { exists: false };
  },

  async checkDuplicate(query: string, type: 'name' | 'phone'): Promise<{ exists: boolean; resultType?: 'lead' | 'unconverted'; data?: Lead | UnconvertedContact }> {
    if (!query || query.trim().length < 3) return { exists: false };
    
    try {
      // 1. Check Leads first
      let q = supabase.from('leads').select('*').order('createdAt', { ascending: false }).limit(1);
      
      if (type === 'phone') {
        const normalized = normalizePhone(query);
        if (!normalized) return { exists: false };
        q = q.eq('phone', normalized);
      } else {
        q = q.ilike('name', `%${query.trim()}%`);
      }

      const { data, error } = await q;

      if (!error && data && data.length > 0) {
        return { exists: true, resultType: 'lead', data: data[0] as Lead };
      }

      // 2. Check Unconverted Contacts
      let ucQ = supabase.from('unconverted_contacts').select('*').order('createdAt', { ascending: false }).limit(1);
      
      if (type === 'phone') {
        const normalized = normalizePhone(query);
        if (!normalized) return { exists: false };
        ucQ = ucQ.eq('phone', normalized);
      } else {
        ucQ = ucQ.ilike('name', `%${query.trim()}%`);
      }

      const { data: ucData, error: ucError } = await ucQ;

      if (!ucError && ucData && ucData.length > 0) {
        return { exists: true, resultType: 'unconverted', data: ucData[0] as UnconvertedContact };
      }

    } catch (e) {
      console.error('Check duplicate exception:', e);
    }
    return { exists: false };
  },

  async addLead(
    leadData: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'callLogs'>,
    author: { name: string; role: UserRole }
  ): Promise<{ success: boolean; error?: string; lead?: Lead; duplicateLead?: Lead }> {
    const normalized = normalizePhone(leadData.phone);

    // Duplicate Check in Supabase first
    try {
      const { data: duplicateData, error: dupError } = await supabase
        .from('leads')
        .select('*')
        .eq('phone', normalized);

      if (dupError) {
        console.error('Duplicate checking error:', dupError);
      } else if (duplicateData && duplicateData.length > 0) {
        const duplicate = duplicateData[0] as Lead;
        return {
          success: false,
          error: `Lead with this phone number (${normalized}) already exists. Name: "${duplicate.name}" (Status: ${duplicate.status}). Created by ${duplicate.addedBy}.`,
          duplicateLead: duplicate,
        };
      }
    } catch (e) {
      console.error('Duplicate check exception:', e);
    }

    const now = new Date().toISOString();
    const newLead: Lead = {
      attendanceStatus: 'Pending',
      ...leadData,
      id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      phone: normalized,
      createdAt: now,
      updatedAt: now,
      statusHistory: [
        {
          status: leadData.status,
          changedBy: author.name,
          changedAt: now,
          notes: 'Lead created in intake'
        }
      ],
      callLogs: []
    };

    // Insert into Supabase
    try {
      const { error } = await supabase.from('leads').insert([newLead]);
      if (error) {
        console.error('Failed to insert lead to Supabase:', error);
        if (error.code === '23505' || error.message?.includes('duplicate key') || error.message?.includes('unique constraint')) {
          return {
            success: false,
            error: `Lead with this phone number (${normalized}) already exists (duplicate entry blocked).`
          };
        }
        return { success: false, error: error.message };
      }
    } catch (e: any) {
      console.error('Supabase insert lead exception:', e);
      return { success: false, error: e.message || String(e) };
    }

    // Create Audit Log
    await this.addAuditLog(
      author.name,
      author.role,
      leadData.status === 'Booked/Confirmed' ? 'Call Center' : 'Moderator',
      'Lead Intake',
      `Added new lead: ${newLead.name} (${newLead.phone}), entity: ${newLead.entity}, priority: ${newLead.priority}. Initial Status: ${newLead.status}.`
    );

    return { success: true, lead: newLead };
  },

  async updateLead(
    leadId: string,
    updates: Partial<Lead>,
    modifier: { name: string; role: UserRole }
  ): Promise<{ success: boolean; lead?: Lead; error?: string }> {
    let oldLead: Lead | undefined;

    // Fetch old lead from Supabase
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', leadId)
        .single();

      if (error || !data) {
        console.error('Failed to fetch lead to update from Supabase:', error);
        return { success: false };
      }
      oldLead = data as Lead;
    } catch (e) {
      console.error('Supabase fetch exception to update:', e);
      return { success: false };
    }

    const now = new Date().toISOString();

    // Check status changes to push to history
    let statusHistory = [...(oldLead.statusHistory || [])];
    if (updates.status && updates.status !== oldLead.status) {
      statusHistory.push({
        status: updates.status,
        changedBy: modifier.name,
        changedAt: now,
        notes: updates.callCenterNote || 'Status changed'
      });
    }

    // Build call logs if a new call center note is added
    let callLogs = [...(oldLead.callLogs || [])];
    if (updates.callCenterNote && updates.callCenterNote !== oldLead.callCenterNote) {
      callLogs.push({
        id: `call-log-${Date.now()}`,
        loggedBy: modifier.name,
        loggedAt: now,
        note: updates.callCenterNote,
        statusAfterCall: updates.status || oldLead.status,
        followUpDue: updates.followUpDue !== undefined ? updates.followUpDue : oldLead.followUpDue
      });
    }

    const updatedLead: Lead = {
      ...oldLead,
      ...updates,
      statusHistory,
      callLogs,
      updatedAt: now,
    };

    // If phone is modified, normalize it
    if (updates.phone) {
      updatedLead.phone = normalizePhone(updates.phone);
    }

    // If status is updated, check isBookedForAppointment toggle consistency
    if (updates.status === 'Booked/Confirmed') {
      updatedLead.isBookedForAppointment = true;
    } else if (updates.status && oldLead.status === 'Booked/Confirmed' && updates.isBookedForAppointment === undefined) {
      updatedLead.isBookedForAppointment = false;
    }

    // Update in Supabase
    try {
      const { error } = await supabase
        .from('leads')
        .update(updatedLead)
        .eq('id', leadId);

      if (error) {
        console.error('Failed to update in Supabase:', error);
        return { success: false };
      }
    } catch (e) {
      console.error('Supabase update exception:', e);
      return { success: false };
    }

    // Audit logs based on role and action
    let logCategory: AuditLog['category'] = 'System';
    if (modifier.role === 'Admin' || modifier.role === 'Organizer') logCategory = 'Organizer';
    else if (modifier.role === 'Call Center') logCategory = 'Call Center';
    else if (modifier.role === 'Team Leader') logCategory = 'Team Leader';
    else if (modifier.role === 'Moderator') logCategory = 'Moderator';

    let logAction = 'Lead Update';
    let logDetails = `Updated lead ${updatedLead.name}.`;
    
    if (updates.status && updates.status !== oldLead.status) {
      logAction = 'Status Change';
      logDetails += ` Changed status from "${oldLead.status}" to "${updates.status}".`;
    }
    if (updates.assignedAgent && updates.assignedAgent !== oldLead.assignedAgent) {
      logAction = 'Lead Assignment';
      logDetails += ` Assigned to agent "${updates.assignedAgent}" (was "${oldLead.assignedAgent}").`;
    }
    if (updates.organizerNote !== undefined && updates.organizerNote !== oldLead.organizerNote) {
      logAction = 'Organizer Note';
      logDetails += ` Added custom organizer notes.`;
      updatedLead.organizerNoteUpdatedAt = now;
    }

    await this.addAuditLog(modifier.name, modifier.role, logCategory, logAction, logDetails);

    return { success: true, lead: updatedLead };
  },

  async deleteLead(id: string, modifier: { name: string; role: UserRole }): Promise<boolean> {
    let leadToDelete: Lead | undefined;
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();
      if (!error && data) {
        leadToDelete = data as Lead;
      }
    } catch (e) {
      console.error('Error fetching lead to delete:', e);
    }

    if (!leadToDelete) return false;

    try {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Failed to delete in Supabase:', error);
        return false;
      }
    } catch (e) {
      console.error('Supabase delete exception:', e);
      return false;
    }

    await this.addAuditLog(
      modifier.name,
      modifier.role,
      'Organizer',
      'Lead Deletion',
      `Deleted lead ${leadToDelete.name} (${leadToDelete.phone})`
    );
    return true;
  },

  // Team Messages Storage API
  async getMessages(): Promise<TeamMessage[]> {
    try {
      const { data, error } = await supabase
        .from('team_messages')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Supabase get messages error:', error);
        return [];
      }

      return (data || []) as TeamMessage[];
    } catch (e) {
      console.error('Supabase connection exception (messages):', e);
      return [];
    }
  },

  async addMessage(content: string, sender: { name: string; role: UserRole }, recipientRole: 'Moderators' | 'Team Leaders' | 'Call Center' | 'All'): Promise<TeamMessage> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString();

    const newMessage: TeamMessage = {
      id: `msg-${Date.now()}`,
      senderName: sender.name,
      senderRole: sender.role,
      recipientRole,
      content,
      timestamp: now.toISOString(),
      isRead: false,
      readBy: [],
      threadId: null,
      expiresAt,
    };

    try {
      const { error } = await supabase.from('team_messages').insert([newMessage]);
      if (error) {
        console.error('Supabase add message error:', error);
      }
    } catch (e) {
      console.error('Supabase add message exception:', e);
    }

    await this.addAuditLog(
      sender.name,
      sender.role,
      sender.role === 'Organizer' || sender.role === 'Admin' ? 'Organizer' : 'System',
      'Team Message',
      `Sent notification to ${recipientRole}: "${content.substring(0, 30)}..."`
    );

    return newMessage;
  },

  async markMessagesAsRead(userRole: UserRole, userName: string): Promise<void> {
    try {
      const messages = await this.getMessages();
      const recipientMap: Record<UserRole, ('Moderators' | 'Team Leaders' | 'Call Center' | 'All')[]> = {
        'Admin': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
        'Organizer': ['All', 'Moderators', 'Team Leaders', 'Call Center'],
        'Team Leader': ['All', 'Team Leaders'],
        'Call Center': ['All', 'Call Center'],
        'Moderator': ['All', 'Moderators'],
        'Doctor': ['All'],
      };

      const targetRecipientRoles = recipientMap[userRole] || ['All'];

      for (const msg of messages) {
        if (targetRecipientRoles.includes(msg.recipientRole) && !msg.readBy.includes(userName)) {
          const updatedReadBy = [...msg.readBy, userName];
          await supabase
            .from('team_messages')
            .update({ readBy: updatedReadBy, isRead: true })
            .eq('id', msg.id);
        }
      }
    } catch (e) {
      console.error('Exception marking messages as read in Supabase:', e);
    }
  },

  async runMessageCleanup(operatorName: string = 'System Automation'): Promise<{ deletedCount: number }> {
    try {
      const now = new Date().toISOString();
      const { data, error: selectError } = await supabase
        .from('team_messages')
        .select('id')
        .lt('expiresAt', now);

      if (selectError) throw selectError;
      const count = data ? data.length : 0;

      if (count > 0) {
        const { error: deleteError } = await supabase
          .from('team_messages')
          .delete()
          .lt('expiresAt', now);

        if (deleteError) throw deleteError;

        await this.addAuditLog(
          operatorName,
          'Admin',
          'System',
          'Auto Cleanup',
          `6-day message retention cleanup routine completed. Permanently deleted ${count} expired broadcast messages.`
        );
      }
      return { deletedCount: count };
    } catch (e) {
      console.error('Exception cleaning up messages in Supabase:', e);
      return { deletedCount: 0 };
    }
  },

  // Audit Logs API
  async getAuditLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Supabase query error (audit logs):', error);
        return [];
      }

      return (data || []) as AuditLog[];
    } catch (e) {
      console.error('Supabase connection exception (audit logs):', e);
      return [];
    }
  },

  async getAttendanceLogs(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('category', 'Attendance')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Supabase query error (attendance logs):', error);
        return [];
      }

      return (data || []) as AuditLog[];
    } catch (e) {
      console.error('Supabase connection exception (attendance logs):', e);
      return [];
    }
  },

  // All activity across every category, used to compute active vs. sleep
  // time inside a login/logout session (any action counts, not just Attendance).
  async getAllLogsForAttendance(): Promise<AuditLog[]> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('timestamp', { ascending: true });

      if (error) {
        console.error('Supabase query error (all logs for attendance):', error);
        return [];
      }

      return (data || []) as AuditLog[];
    } catch (e) {
      console.error('Supabase connection exception (all logs for attendance):', e);
      return [];
    }
  },

  // Called whenever a session is restored from localStorage (i.e. the user
  // never re-entered their PIN). Without this, recordLogin() only ever fires
  // once - the very first time someone logs in on a device - because the
  // saved session silently persists across days. This checks the most recent
  // Attendance log for the user in Africa/Cairo time; if it isn't from today,
  // it records a fresh Login so daily attendance is actually captured.
  async ensureDailyAttendance(user: string, role: UserRole): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user', user)
        .eq('category', 'Attendance')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking daily attendance:', error);
        return;
      }

      const cairoDateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' });
      const todayCairo = cairoDateFmt.format(new Date());

      if (!data || data.length === 0) {
        await this.recordLogin(user, role);
        return;
      }

      const latest = data[0] as AuditLog;
      const latestCairo = cairoDateFmt.format(new Date(latest.timestamp));

      if (latestCairo !== todayCairo) {
        // Last recorded attendance event was on a previous day - start a fresh one.
        await this.recordLogin(user, role);
      }
    } catch (e) {
      console.error('Exception ensuring daily attendance:', e);
    }
  },

  async addAuditLog(user: string, role: UserRole, category: AuditLog['category'], action: string, details: string): Promise<void> {
    const newLog: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      user,
      role,
      category,
      action,
      details
    };

    try {
      const { error } = await supabase.from('audit_logs').insert([newLog]);
      if (error) {
        console.error('Failed to write audit log to Supabase:', error);
      }
    } catch (e) {
      console.error('Exception writing audit log:', e);
    }
  },

  async recordLogin(user: string, role: UserRole): Promise<void> {
    try {
      // 1. Check if user has an unmatched login
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user', user)
        .eq('category', 'Attendance')
        .order('timestamp', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking unmatched login:', error);
      } else if (data && data.length > 0) {
        const latest = data[0] as AuditLog;
        if (latest.action === 'Login') {
          // Found unmatched login! Insert a Logout event timestamped at the current moment
          const now = new Date().toISOString();
          const autoLogout: AuditLog = {
            id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            timestamp: now,
            user,
            role,
            category: 'Attendance',
            action: 'Logout',
            details: 'Auto-closed (abnormal end)'
          };
          await supabase.from('audit_logs').insert([autoLogout]);
        }
      }

      // 2. Insert new login event
      const now = new Date().toISOString();
      const loginLog: AuditLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        user,
        role,
        category: 'Attendance',
        action: 'Login',
        details: 'User logged in successfully'
      };
      await supabase.from('audit_logs').insert([loginLog]);
    } catch (e) {
      console.error('Exception recording login:', e);
    }
  },

  async recordLogout(user: string, role: UserRole, details: string = 'User logged out explicitly'): Promise<void> {
    try {
      const now = new Date().toISOString();
      const logoutLog: AuditLog = {
        id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: now,
        user,
        role,
        category: 'Attendance',
        action: 'Logout',
        details
      };
      await supabase.from('audit_logs').insert([logoutLog]);
    } catch (e) {
      console.error('Exception recording logout:', e);
    }
  },

  // Users Storage API (Dynamic Team Roster)
  async getUsers(): Promise<SystemUser[]> {
    try {
      const { data, error } = await supabase
        .from('system_users')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Supabase query error (users):', error);
        this.setError(error.message);
        return SYSTEM_USERS;
      }

      this.setError(null);
      return (data || []) as SystemUser[];
    } catch (e: any) {
      console.error('Supabase connection exception (users):', e);
      this.setError(e.message || String(e));
      return SYSTEM_USERS;
    }
  },

  async addUser(user: SystemUser): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await this.getUsers();
      if (users.some(u => u.pin === user.pin)) {
        return { success: false, error: `A team member with PIN "${user.pin}" already exists.` };
      }

      const { error } = await supabase.from('system_users').insert([user]);
      if (error) throw error;

    } catch (e: any) {
      console.error('Exception adding system user in Supabase:', e);
      return { success: false, error: e.message || 'Failed to add user.' };
    }

    await this.addAuditLog(
      'Hamdi',
      'Admin',
      'System',
      'Add User',
      `Added new team member: ${user.name} (${user.role}) with PIN ${user.pin}.`
    );
    return { success: true };
  },

  async updateUser(oldPin: string, updatedUser: SystemUser): Promise<{ success: boolean; error?: string }> {
    try {
      const users = await this.getUsers();
      if (oldPin !== updatedUser.pin && users.some(u => u.pin === updatedUser.pin)) {
        return { success: false, error: `A team member with PIN "${updatedUser.pin}" already exists.` };
      }

      if (oldPin !== updatedUser.pin) {
        const { error: delError } = await supabase.from('system_users').delete().eq('pin', oldPin);
        if (delError) throw delError;
        const { error: insError } = await supabase.from('system_users').insert([updatedUser]);
        if (insError) throw insError;
      } else {
        const { error } = await supabase
          .from('system_users')
          .update(updatedUser)
          .eq('pin', oldPin);
        if (error) throw error;
      }

    } catch (e: any) {
      console.error('Exception updating system user in Supabase:', e);
      return { success: false, error: e.message || 'Failed to update user.' };
    }

    await this.addAuditLog(
      'Hamdi',
      'Admin',
      'System',
      'Update User',
      `Updated team member: ${updatedUser.name} (${updatedUser.role}). PIN updated from ${oldPin} to ${updatedUser.pin}.`
    );
    return { success: true };
  },

  async deleteUser(pin: string): Promise<{ success: boolean; error?: string }> {
    let userToDelete: SystemUser | undefined;
    try {
      const users = await this.getUsers();
      userToDelete = users.find(u => u.pin === pin);
      if (!userToDelete) {
        return { success: false, error: 'User not found.' };
      }
      if (users.length <= 1) {
        return { success: false, error: 'Cannot delete the last remaining user.' };
      }

      const { error } = await supabase.from('system_users').delete().eq('pin', pin);
      if (error) throw error;

    } catch (e: any) {
      console.error('Exception deleting system user in Supabase:', e);
      return { success: false, error: e.message || 'Failed to delete user.' };
    }

    await this.addAuditLog(
      'Hamdi',
      'Admin',
      'System',
      'Delete User',
      `Removed team member: ${userToDelete.name} (${userToDelete.role}) with PIN ${pin}.`
    );
    return { success: true };
  },

  // Clear leads database to prepare for previous contact data uploads
  async clearLeadsDatabase(): Promise<{ success: boolean; count: number }> {
    let count = 0;
    try {
      const leads = await this.getLeads();
      count = leads.length;

      const { error } = await supabase.from('leads').delete().neq('id', '');
      if (error) throw error;

    } catch (e) {
      console.error('Exception clearing database in Supabase:', e);
    }

    await this.addAuditLog(
      'Hamdi',
      'Admin',
      'System',
      'Database Clean-up',
      `Purged all ${count} leads in preparation for previous contacts data import.`
    );
    return { success: true, count };
  },

  // Batch import leads from Google Sheets / Apps Script structure
  async importLeadsBatch(leadsToImport: Omit<Lead, 'id' | 'createdAt' | 'updatedAt' | 'statusHistory' | 'callLogs'>[], importerName: string): Promise<{ imported: number; duplicates: number; errors: string[] }> {
    const currentLeads = await this.getLeads();
    let importedCount = 0;
    let duplicateCount = 0;
    const errors: string[] = [];
    const leadsToInsert: Lead[] = [];

    for (const leadData of leadsToImport) {
      const normalized = normalizePhone(leadData.phone);
      const isDuplicate = currentLeads.some(l => normalizePhone(l.phone) === normalized);
      
      if (isDuplicate) {
        duplicateCount++;
        continue;
      }

      const now = new Date().toISOString();
      const newLead: Lead = {
        ...leadData,
        id: `lead-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        phone: normalized,
        createdAt: now,
        updatedAt: now,
        statusHistory: [
          {
            status: leadData.status,
            changedBy: importerName,
            changedAt: now,
            notes: 'Imported from spreadsheet backup'
          }
        ],
        callLogs: []
      };

      leadsToInsert.push(newLead);
      importedCount++;
    }

    if (leadsToInsert.length > 0) {
      try {
        const { error } = await supabase.from('leads').insert(leadsToInsert);
        if (error) {
          console.error('Failed to batch insert to Supabase:', error);
          errors.push(error.message);
        }
      } catch (e: any) {
        console.error('Supabase batch insert exception:', e);
        errors.push(e.message || String(e));
      }

      await this.addAuditLog(
        importerName,
        'Admin',
        'System',
        'Data Import',
        `Successfully imported ${importedCount} leads. Skipped ${duplicateCount} duplicate phone entries.`
      );
    }

    return { imported: importedCount, duplicates: duplicateCount, errors };
  },

  // Unconverted Contacts API
  async addUnconvertedContact(data: {
    entity: LeadEntity;
    platform: LeadPlatform;
    reason: string;
    name: string | null;
    phone: string | null;
    loggedBy: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const newContact = {
        id: `uc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        entity: data.entity,
        platform: data.platform,
        reason: data.reason,
        name: data.name,
        phone: data.phone,
        loggedBy: data.loggedBy,
        createdAt: new Date().toISOString(),
        convertedToLeadId: null,
      };
      const { error } = await supabase.from('unconverted_contacts').insert([newContact]);
      if (error) {
        console.error('Failed to insert unconverted contact:', error);
        return { success: false, error: error.message };
      }
      return { success: true };
    } catch (e: any) {
      console.error('Exception inserting unconverted contact:', e);
      return { success: false, error: e.message || String(e) };
    }
  },

  async getUnconvertedContacts(): Promise<UnconvertedContact[]> {
    try {
      const { data, error } = await supabase
        .from('unconverted_contacts')
        .select('*')
        .order('createdAt', { ascending: false });
      if (error) {
        console.error('Supabase get unconverted contacts error:', error);
        return [];
      }
      return (data || []) as UnconvertedContact[];
    } catch (e) {
      console.error('Supabase connection exception (unconverted):', e);
      return [];
    }
  },

  async promoteUnconvertedToLead(contactId: string, leadId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('unconverted_contacts')
        .update({ convertedToLeadId: leadId })
        .eq('id', contactId);
      if (error) {
        console.error('Failed to update unconverted contact:', error);
        return false;
      }
      return true;
    } catch (e) {
      console.error('Exception promoting unconverted contact:', e);
      return false;
    }
  },

  // Doctors, recurring availability, and structured appointments API
  async getDoctors(): Promise<import('../types').Doctor[]> {
    try {
      const { data, error } = await supabase.from('doctors').select('*').order('name', { ascending: true });
      if (error) { console.error('Supabase get doctors error:', error); return []; }
      return (data || []) as import('../types').Doctor[];
    } catch (e) { console.error('Supabase get doctors exception:', e); return []; }
  },

  async addDoctor(data: Omit<import('../types').Doctor, 'id' | 'createdAt' | 'updatedAt'>, actor: { name: string; role: UserRole }): Promise<{ success: boolean; doctor?: import('../types').Doctor; error?: string }> {
    const now = new Date().toISOString();
    const doctor = { ...data, id: `doctor-${Date.now()}-${Math.floor(Math.random() * 1000)}`, createdAt: now, updatedAt: now };
    try {
      const { error } = await supabase.from('doctors').insert([doctor]);
      if (error) return { success: false, error: error.message };
      await this.addAuditLog(actor.name, actor.role, 'Organizer', 'Add Doctor', `Added doctor ${doctor.name} at ${doctor.branch}.`);
      return { success: true, doctor: doctor as import('../types').Doctor };
    } catch (e: any) { return { success: false, error: e.message || String(e) }; }
  },

  async updateDoctor(id: string, updates: Partial<import('../types').Doctor>, actor: { name: string; role: UserRole }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('doctors').update({ ...updates, updatedAt: new Date().toISOString() }).eq('id', id);
      if (error) return { success: false, error: error.message };
      await this.addAuditLog(actor.name, actor.role, 'Organizer', 'Update Doctor', `Updated doctor ${id}.`);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message || String(e) }; }
  },

  async getAvailability(doctorId: string): Promise<import('../types').DoctorAvailability[]> {
    try {
      const { data, error } = await supabase.from('doctor_availability').select('*').eq('doctorId', doctorId).order('dayOfWeek').order('startTime');
      if (error) { console.error('Supabase get availability error:', error); return []; }
      return (data || []) as import('../types').DoctorAvailability[];
    } catch (e) { console.error('Supabase get availability exception:', e); return []; }
  },

  async saveAvailability(rule: Omit<import('../types').DoctorAvailability, 'id'>, actor: { name: string; role: UserRole }): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: existing } = await supabase.from('doctor_availability').select('id').eq('doctorId', rule.doctorId).eq('dayOfWeek', rule.dayOfWeek).maybeSingle();
      const payload = { ...rule, id: existing?.id || `availability-${Date.now()}-${Math.floor(Math.random() * 1000)}` };
      const { error } = existing
        ? await supabase.from('doctor_availability').update(rule).eq('id', existing.id)
        : await supabase.from('doctor_availability').insert([payload]);
      if (error) return { success: false, error: error.message };
      await this.addAuditLog(actor.name, actor.role, 'Organizer', 'Update Availability', `Updated weekly availability for doctor ${rule.doctorId}.`);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message || String(e) }; }
  },

  async getAppointments(filters?: { from?: string; to?: string; doctorId?: string }): Promise<import('../types').Appointment[]> {
    try {
      let query = supabase.from('appointments').select('*').order('appointmentDate', { ascending: true }).order('startTime', { ascending: true });
      if (filters?.from) query = query.gte('appointmentDate', filters.from);
      if (filters?.to) query = query.lte('appointmentDate', filters.to);
      if (filters?.doctorId) query = query.eq('doctorId', filters.doctorId);
      const { data, error } = await query;
      if (error) { console.error('Supabase get appointments error:', error); return []; }
      return (data || []) as import('../types').Appointment[];
    } catch (e) { console.error('Supabase get appointments exception:', e); return []; }
  },

  async addAppointment(data: Omit<import('../types').Appointment, 'id' | 'createdAt' | 'updatedAt'>, actor: { name: string; role: UserRole }): Promise<{ success: boolean; appointment?: import('../types').Appointment; error?: string }> {
    const now = new Date().toISOString();
    const appointment = { ...data, id: `appointment-${Date.now()}-${Math.floor(Math.random() * 1000)}`, createdAt: now, updatedAt: now };
    try {
      const { error } = await supabase.from('appointments').insert([appointment]);
      if (error) {
        const conflict = error.code === '23505' || error.message.toLowerCase().includes('unique');
        return { success: false, error: conflict ? 'هذا الموعد تم حجزه للتو. حدّث القائمة واختر موعدًا آخر.' : error.message };
      }
      await this.addAuditLog(actor.name, actor.role, 'Call Center', 'Create Appointment', `Created appointment for ${appointment.patientName} with ${appointment.doctorName} on ${appointment.appointmentDate} at ${appointment.startTime}.`);
      return { success: true, appointment: appointment as import('../types').Appointment };
    } catch (e: any) { return { success: false, error: e.message || String(e) }; }
  },

  async updateAppointment(id: string, updates: Partial<import('../types').Appointment>, actor: { name: string; role: UserRole }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.from('appointments').update({ ...updates, updatedAt: new Date().toISOString() }).eq('id', id);
      if (error) return { success: false, error: error.message };
      await this.addAuditLog(actor.name, actor.role, 'Call Center', 'Update Appointment', `Updated appointment ${id}.`);
      return { success: true };
    } catch (e: any) { return { success: false, error: e.message || String(e) }; }
  },

  async runDiagnostics(): Promise<{
    tableName: string;
    status: 'Healthy' | 'Error';
    rowCount: number;
    latencyMs: number;
    errorMessage?: string;
  }[]> {
    const tables = ['leads', 'system_users', 'audit_logs'];
    const results = [];

    for (const table of tables) {
      const startTime = performance.now();
      try {
        const { error } = await supabase
          .from(table)
          .select('*')
          .limit(1);

        const endTime = performance.now();
        const latencyMs = Math.round(endTime - startTime);

        if (error) {
          results.push({
            tableName: table,
            status: 'Error' as const,
            rowCount: 0,
            latencyMs,
            errorMessage: error.message
          });
        } else {
          // Row access works, let's get the exact count
          const { count, error: countError } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });

          results.push({
            tableName: table,
            status: 'Healthy' as const,
            rowCount: count ?? 0,
            latencyMs,
          });
        }
      } catch (e: any) {
        const endTime = performance.now();
        results.push({
          tableName: table,
          status: 'Error' as const,
          rowCount: 0,
          latencyMs: Math.round(endTime - startTime),
          errorMessage: e.message || String(e)
        });
      }
    }

    return results;
  }
};
