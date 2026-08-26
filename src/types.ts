export type UserRole = 'Admin' | 'Organizer' | 'Team Leader' | 'Call Center' | 'Moderator' | 'Doctor';

export interface SystemUser {
  pin: string;
  name: string;
  role: UserRole;
  avatarColor: string;
  doctorId?: string | null;
}

export const SYSTEM_USERS: SystemUser[] = [
  { pin: '1811', name: 'Hamdi', role: 'Admin', avatarColor: 'bg-rose-600' },
  { pin: '1010', name: 'Weddan', role: 'Organizer', avatarColor: 'bg-amber-500' },
  { pin: '1234', name: 'Hanaa', role: 'Team Leader', avatarColor: 'bg-purple-600' },
  { pin: '0001', name: 'Omar', role: 'Call Center', avatarColor: 'bg-blue-600' },
  { pin: '0002', name: 'Eman', role: 'Call Center', avatarColor: 'bg-teal-600' },
  { pin: '1111', name: 'Amal', role: 'Moderator', avatarColor: 'bg-emerald-600' },
  { pin: '2222', name: 'Menna', role: 'Moderator', avatarColor: 'bg-indigo-600' },
];

export type LeadEntity = 'Dr. Ihab' | 'Eye World' | 'Top Care';
export type LeadPlatform = 'Instagram' | 'Facebook' | 'WhatsApp' | 'TikTok' | 'Referral' | 'Other';
export type LeadPriority = 'Hot' | 'Warm' | 'Cold';
export type LeadStatus = 'Pending Call Center' | 'Under Follow-Up' | 'Booked/Confirmed' | 'Canceled' | 'Re-engage Lead';

export interface StatusHistoryEntry {
  status: LeadStatus;
  changedBy: string;
  changedAt: string;
  notes?: string;
}

export interface CallLogEntry {
  id: string;
  loggedBy: string;
  loggedAt: string;
  note: string;
  statusAfterCall: LeadStatus;
  followUpDue: string | null;
}

export interface Lead {
  id: string;
  customerId?: string | null;
  name: string;
  phone: string; // Internal: 0XXXXXXXXXX format
  entity: LeadEntity;
  platform: LeadPlatform;
  priority: LeadPriority;
  status: LeadStatus;
  inquiryNote: string;
  addedBy: string;
  assignedAgent: string; // Agent name or 'Unassigned'
  followUpDue: string | null; // YYYY-MM-DD
  callCenterNote: string;
  organizerNote: string;
  organizerNoteUpdatedAt: string | null;
  createdAt: string; // ISO String
  updatedAt: string; // ISO String
  isBookedForAppointment: boolean;
  commissionEligible: boolean;
  attendanceStatus: 'Pending' | 'Booked' | 'Attended' | 'No-Show';
  statusHistory: StatusHistoryEntry[];
  callLogs: CallLogEntry[];
}

export interface TeamMessage {
  id: string;
  senderName: string;
  senderRole: UserRole;
  recipientRole: 'Moderators' | 'Team Leaders' | 'Call Center' | 'All';
  content: string;
  timestamp: string; // ISO string
  isRead: boolean;
  readBy: string[]; // List of user names who have seen it
  threadId: string | null;
  expiresAt: string; // 6 days from creation
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: UserRole;
  category: 'Moderator' | 'Call Center' | 'Team Leader' | 'Organizer' | 'System' | 'Attendance';
  action: string;
  details: string;
}

export type UnconvertedReason = 'No phone provided' | 'No name provided' | 'Went silent' | 'Spam/irrelevant' | 'Other';

export interface Doctor {
  id: string;
  name: string;
  clinic: 'Eye World' | 'Top Care' | string;
  department: 'Dr. Ihab Clinic' | 'Eye World Hospital' | 'Dermatology' | 'Dentistry' | string;
  degree: string;
  specialty: string;
  branch: string;
  phone: string;
  consultationFee: string;
  isActive: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface DoctorAvailability {
  id: string;
  doctorId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  isActive: boolean;
}

export type AppointmentStatus = 'Pending' | 'Confirmed' | 'Canceled' | 'Rescheduled' | 'Completed' | 'No-Show';
export type BookingSource = 'Moderator' | 'Call Center' | 'Organizer' | 'Doctor' | 'Other';

export interface Appointment {
  id: string;
  leadId: string | null;
  customerId: string | null;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  branch: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  bookingSource: BookingSource;
  notes: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  canceledReason: string | null;
}

export interface UnconvertedContact {
  id: string;
  entity: LeadEntity;
  platform: LeadPlatform;
  reason: UnconvertedReason;
  name: string | null;
  phone: string | null;
  loggedBy: string;
  createdAt: string;
  convertedToLeadId?: string;
}
