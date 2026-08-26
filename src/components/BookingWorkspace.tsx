import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, CheckCircle2, Clock3, Plus, RefreshCw, Search, Stethoscope, UserRound, XCircle } from 'lucide-react';
import { DatabaseService } from '../services/db';
import { Appointment, AppointmentStatus, BookingSource, Doctor, DoctorAvailability, Lead, SystemUser } from '../types';

type Props = { currentUser: SystemUser };
const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const activeStatuses: AppointmentStatus[] = ['Pending', 'Confirmed'];

function minutes(value: string) {
  const [hours, mins] = value.split(':').map(Number);
  return hours * 60 + mins;
}
function timeValue(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function dateForDay(value: string) {
  return new Date(`${value}T12:00:00`).getDay();
}
function sourceForRole(role: SystemUser['role']): BookingSource {
  if (role === 'Moderator' || role === 'Call Center' || role === 'Organizer' || role === 'Doctor') return role;
  return 'Other';
}

export default function BookingWorkspace({ currentUser }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<DoctorAvailability[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [selectedClinic, setSelectedClinic] = useState<'Eye World' | 'Top Care' | 'All'>('All');
  const [selectedDepartment, setSelectedDepartment] = useState<'All' | 'Dr. Ihab Clinic' | 'Eye World Hospital' | 'Dermatology' | 'Dentistry'>('All');
  const [selectedDate, setSelectedDate] = useState(today);
  const [patientQuery, setPatientQuery] = useState('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [status, setStatus] = useState<AppointmentStatus>('Confirmed');
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [doctorForm, setDoctorForm] = useState({ name: '', clinic: 'Eye World' as 'Eye World' | 'Top Care', department: 'Eye World Hospital' as 'Dr. Ihab Clinic' | 'Eye World Hospital' | 'Dermatology' | 'Dentistry', degree: '', specialty: '', branch: '', phone: '', consultationFee: '', notes: '' });
  const [ruleForm, setRuleForm] = useState({ dayOfWeek: 0, startTime: '09:00', endTime: '17:00', slotDurationMinutes: 30 });

  const canManageDoctors = currentUser.role === 'Admin' || currentUser.role === 'Organizer';
  const isDoctor = currentUser.role === 'Doctor';

  const refreshDoctors = async () => {
    const result = await DatabaseService.getDoctors();
    setDoctors(result);
    if (!selectedDoctorId && result.length) setSelectedDoctorId(isDoctor ? (currentUser.doctorId || result.find(d => d.name.toLowerCase() === currentUser.name.toLowerCase())?.id || '') : result[0].id);
  };

  const refreshBookingData = async () => {
    if (!selectedDate) return;
    setLoading(true);
    const [freshLeads, freshAppointments] = await Promise.all([
      DatabaseService.getLeads(),
      DatabaseService.getAppointments({ from: selectedDate, to: selectedDate, doctorId: selectedDoctorId || undefined }),
    ]);
    setLeads(freshLeads);
    setAppointments(freshAppointments);
    if (selectedDoctorId) setAvailability(await DatabaseService.getAvailability(selectedDoctorId));
    setLoading(false);
  };

  useEffect(() => { refreshDoctors(); }, []);
  useEffect(() => {
    refreshBookingData();
    const interval = window.setInterval(refreshBookingData, 10000);
    return () => window.clearInterval(interval);
  }, [selectedDoctorId, selectedDate]);

  const doctorForUser = currentUser.doctorId ? doctors.find(d => d.id === currentUser.doctorId) : doctors.find(d => d.name.toLowerCase() === currentUser.name.toLowerCase());
  const clinicDoctors = doctors.filter(d => (selectedClinic === 'All' || d.clinic === selectedClinic) && (selectedDepartment === 'All' || d.department === selectedDepartment));
  const visibleDoctors = isDoctor ? (doctorForUser ? [doctorForUser] : []) : clinicDoctors;
  const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
  const matchingPatients = useMemo(() => {
    const query = patientQuery.trim().toLowerCase();
    if (query.length < 2) return [];
    return leads.filter(lead => [lead.name, lead.phone, lead.customerId || '', lead.id].some(value => value.toLowerCase().includes(query))).slice(0, 8);
  }, [leads, patientQuery]);

  const dayRule = availability.find(rule => rule.dayOfWeek === dateForDay(selectedDate) && rule.isActive);
  const slots = useMemo(() => {
    if (!dayRule) return [];
    const output: string[] = [];
    for (let start = minutes(dayRule.startTime); start + dayRule.slotDurationMinutes <= minutes(dayRule.endTime); start += dayRule.slotDurationMinutes) output.push(timeValue(start));
    return output;
  }, [dayRule]);
  const bookedTimes = new Set(appointments.filter(a => activeStatuses.includes(a.status)).map(a => a.startTime));

  const handleCreateAppointment = async (event: React.FormEvent) => {
    event.preventDefault();
    const form = event.currentTarget as HTMLFormElement;
    const data = new FormData(form);
    const startTime = String(data.get('startTime') || '');
    if (!selectedDoctor || !selectedLead || !startTime) { setNotice({ type: 'error', text: 'اختر المريض والطبيب والموعد أولًا.' }); return; }
    const duration = dayRule?.slotDurationMinutes || 30;
    const result = await DatabaseService.addAppointment({
      leadId: selectedLead.id,
      customerId: selectedLead.customerId || null,
      patientName: selectedLead.name,
      patientPhone: selectedLead.phone,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      branch: selectedDoctor.branch,
      appointmentDate: selectedDate,
      startTime,
      endTime: timeValue(minutes(startTime) + duration),
      status,
      bookingSource: sourceForRole(currentUser.role),
      notes: notes.trim(),
      createdBy: currentUser.name,
      canceledReason: null,
    }, currentUser);
    if (!result.success) { setNotice({ type: 'error', text: result.error || 'تعذر إنشاء الحجز.' }); return; }
    setNotice({ type: 'success', text: 'تم تسجيل الحجز وأصبح ظاهرًا للفريق والطبيب.' });
    setSelectedLead(null); setPatientQuery(''); setNotes('');
    await refreshBookingData();
  };

  const handleStatus = async (appointment: Appointment, next: AppointmentStatus) => {
    const result = await DatabaseService.updateAppointment(appointment.id, { status: next, canceledReason: next === 'Canceled' ? 'Canceled by operator' : null }, currentUser);
    if (!result.success) setNotice({ type: 'error', text: result.error || 'تعذر تحديث حالة الحجز.' });
    else { setNotice({ type: 'success', text: `تم تحديث الحجز إلى ${next}.` }); await refreshBookingData(); }
  };

  const handleAddDoctor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctorForm.name.trim() || !doctorForm.branch.trim()) return;
    const result = await DatabaseService.addDoctor({ ...doctorForm, isActive: true }, currentUser);
    if (!result.success) { setNotice({ type: 'error', text: result.error || 'تعذر إضافة الطبيب.' }); return; }
    setDoctorForm({ name: '', clinic: 'Eye World', department: 'Eye World Hospital', degree: '', specialty: '', branch: '', phone: '', consultationFee: '', notes: '' });
    setNotice({ type: 'success', text: 'تمت إضافة الطبيب. أضف availability الخاصة به الآن.' });
    await refreshDoctors();
  };

  const handleSaveRule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedDoctorId) return;
    const result = await DatabaseService.saveAvailability({ id: '', doctorId: selectedDoctorId, ...ruleForm, isActive: true }, currentUser);
    if (!result.success) setNotice({ type: 'error', text: result.error || 'تعذر حفظ availability.' });
    else { setNotice({ type: 'success', text: 'تم حفظ مواعيد الطبيب الأسبوعية.' }); setAvailability(await DatabaseService.getAvailability(selectedDoctorId)); }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6" dir="ltr">
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3"><div className="p-2.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><CalendarDays className="w-6 h-6 text-emerald-400" /></div><div><h1 className="text-3xl font-extrabold text-white">Appointments Workspace</h1><p className="text-sm text-neutral-500 mt-1">One shared schedule for moderators, call center, organizers, and doctors.</p></div></div>
        </div>
        <button onClick={refreshBookingData} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs font-bold hover:bg-neutral-800"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh live data</button>
      </div>

      {notice && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>{notice.text}</div>}

      <div className="glass-panel rounded-2xl border border-neutral-800 p-4"><div className="flex flex-col md:flex-row md:items-center gap-3"><span className="text-xs font-bold text-neutral-400">Clinic / department</span><select value={selectedClinic} onChange={e => { const value = e.target.value as typeof selectedClinic; setSelectedClinic(value); setSelectedDepartment('All'); setSelectedDoctorId(''); }} className="w-full md:w-56 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white"><option value="All">All organizations</option><option value="Eye World">Eye World / دنيا العيون</option><option value="Top Care">Top Care</option></select><select value={selectedDepartment} onChange={e => { setSelectedDepartment(e.target.value as typeof selectedDepartment); setSelectedDoctorId(''); }} className="w-full md:w-56 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white"><option value="All">All departments</option>{selectedClinic !== 'Top Care' && <><option value="Dr. Ihab Clinic">Dr. Ihab Clinic / عيادة د. إيهاب</option><option value="Eye World Hospital">Eye World Hospital / مستشفى دنيا العيون</option></>}{selectedClinic !== 'Eye World' && <><option value="Dermatology">Dermatology / الجلدية</option><option value="Dentistry">Dentistry / الأسنان</option></>}</select><span className="text-[11px] text-neutral-600">{clinicDoctors.length} doctors configured</span></div></div>\n\n      <div className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="space-y-6">
          <div className="glass-panel rounded-2xl border border-neutral-800 p-5 space-y-5">
            <div className="flex items-center justify-between"><div><h2 className="text-base font-extrabold text-white flex items-center gap-2"><UserRound className="w-4 h-4 text-emerald-400" /> New booking</h2><p className="text-xs text-neutral-500 mt-1">Search an existing lead by Customer ID, phone, name, or lead ID.</p></div><span className="text-[10px] uppercase tracking-widest font-bold text-neutral-600">{currentUser.role}</span></div>
            <div className="relative"><Search className="absolute left-3 top-3 w-4 h-4 text-neutral-500" /><input value={patientQuery} onChange={e => setPatientQuery(e.target.value)} placeholder="Search patient..." className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500" />
              {matchingPatients.length > 0 && <div className="absolute left-0 right-0 top-12 z-20 rounded-xl bg-neutral-900 border border-neutral-700 shadow-2xl overflow-hidden">{matchingPatients.map(lead => <button key={lead.id} onClick={() => { setSelectedLead(lead); setPatientQuery(lead.name); }} className="w-full text-left px-4 py-3 hover:bg-neutral-800 border-b border-neutral-800 last:border-0"><p className="text-sm font-bold text-white">{lead.name}</p><p className="text-[11px] text-neutral-400 font-mono">{lead.customerId || 'No Customer ID'} · {lead.phone}</p></button>)}</div>}
            </div>
            {selectedLead && <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 flex items-center justify-between"><div><p className="text-sm font-bold text-emerald-300">{selectedLead.name}</p><p className="text-[11px] text-neutral-400">{selectedLead.customerId || 'No Customer ID'} · {selectedLead.phone}</p></div><button onClick={() => { setSelectedLead(null); setPatientQuery(''); }} className="text-neutral-500 hover:text-white"><XCircle className="w-4 h-4" /></button></div>}

            <form onSubmit={handleCreateAppointment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-xs font-bold text-neutral-400">Doctor<select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} disabled={isDoctor} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"><option value="">Select doctor</option>{visibleDoctors.filter(d => d.isActive).map(d => <option key={d.id} value={d.id}>{d.name} · {d.branch}</option>)}</select></label>
              <label className="text-xs font-bold text-neutral-400">Date<input type="date" min={today} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white" /></label>
              <div className="md:col-span-2"><p className="text-xs font-bold text-neutral-400 mb-2">Available slots {dayRule ? `· ${dayRule.startTime}–${dayRule.endTime}` : ''}</p><div className="grid grid-cols-3 sm:grid-cols-5 gap-2">{slots.length === 0 ? <div className="col-span-full rounded-xl border border-dashed border-neutral-800 py-5 text-center text-xs text-neutral-600">No availability configured for {weekdays[dateForDay(selectedDate)]}.</div> : slots.map(slot => <label key={slot} className={`relative rounded-lg border text-center py-2 text-xs font-bold ${bookedTimes.has(slot) ? 'border-neutral-800 text-neutral-700 bg-neutral-950' : 'border-neutral-700 text-neutral-300 hover:border-emerald-500/50'}`}><input type="radio" name="startTime" value={slot} disabled={bookedTimes.has(slot)} className="sr-only peer" /><span className="peer-checked:text-emerald-300 peer-checked:border-emerald-500">{slot}</span>{bookedTimes.has(slot) && <span className="block text-[9px] text-rose-400">Booked</span>}</label>)}</div></div>
              <label className="text-xs font-bold text-neutral-400">Status<select value={status} onChange={e => setStatus(e.target.value as AppointmentStatus)} className="mt-1 w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white"><option>Confirmed</option><option>Pending</option></select></label>
              <label className="text-xs font-bold text-neutral-400">Notes<input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional booking note" className="mt-1 w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-white" /></label>
              <button type="submit" className="md:col-span-2 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white py-3 text-sm font-extrabold"><CheckCircle2 className="w-4 h-4" /> Save booking</button>
            </form>
          </div>

          <div className="glass-panel rounded-2xl border border-neutral-800 overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between"><div><h2 className="text-base font-extrabold text-white">Bookings on {selectedDate}</h2><p className="text-xs text-neutral-500">Every saved booking is shared from the same structured record.</p></div><span className="text-xs font-bold text-emerald-400">{appointments.length} total</span></div>
            <div className="divide-y divide-neutral-800">{appointments.length === 0 ? <div className="p-10 text-center text-neutral-600 text-sm">No bookings for this date.</div> : appointments.map(appointment => <div key={appointment.id} className="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"><div><div className="flex items-center gap-2"><Clock3 className="w-4 h-4 text-emerald-400" /><span className="text-sm font-extrabold text-white">{appointment.startTime}–{appointment.endTime}</span><span className={`text-[10px] px-2 py-1 rounded-full border ${appointment.status === 'Confirmed' ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10' : appointment.status === 'Canceled' ? 'text-rose-300 border-rose-500/20 bg-rose-500/10' : 'text-amber-300 border-amber-500/20 bg-amber-500/10'}`}>{appointment.status}</span></div><p className="text-sm text-neutral-200 font-bold mt-1">{appointment.patientName} <span className="text-neutral-500 font-normal">· {appointment.patientPhone}</span></p><p className="text-[11px] text-neutral-500">{appointment.doctorName} · {appointment.branch} · booked by {appointment.createdBy}</p>{appointment.notes && <p className="text-xs text-neutral-400 mt-1">{appointment.notes}</p>}</div><div className="flex gap-2">{appointment.status !== 'Canceled' && <button onClick={() => handleStatus(appointment, 'Canceled')} className="px-3 py-1.5 rounded-lg border border-rose-500/20 text-rose-300 text-[10px] font-bold hover:bg-rose-500/10">Cancel</button>}{appointment.status === 'Confirmed' && <button onClick={() => handleStatus(appointment, 'Completed')} className="px-3 py-1.5 rounded-lg border border-emerald-500/20 text-emerald-300 text-[10px] font-bold hover:bg-emerald-500/10">Complete</button>}</div></div>)}</div>
          </div>
        </section>

        <aside className="space-y-6">
          {canManageDoctors && <div className="glass-panel rounded-2xl border border-neutral-800 p-5 space-y-4"><div><h2 className="text-base font-extrabold text-white flex items-center gap-2"><Stethoscope className="w-4 h-4 text-emerald-400" /> Doctor setup</h2><p className="text-xs text-neutral-500 mt-1">Add the actual doctors; the list starts empty to avoid invented medical data.</p></div><form onSubmit={handleAddDoctor} className="space-y-2"><input required value={doctorForm.name} onChange={e => setDoctorForm({ ...doctorForm, name: e.target.value })} placeholder="Doctor name" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><select value={doctorForm.clinic} onChange={e => setDoctorForm({ ...doctorForm, clinic: e.target.value as typeof doctorForm.clinic, department: e.target.value === 'Top Care' ? 'Dermatology' : 'Eye World Hospital' })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white"><option value="Eye World">Eye World / دنيا العيون</option><option value="Top Care">Top Care</option></select><select value={doctorForm.department} onChange={e => setDoctorForm({ ...doctorForm, department: e.target.value as typeof doctorForm.department })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white">{doctorForm.clinic === 'Eye World' ? <><option value="Dr. Ihab Clinic">Dr. Ihab Clinic / عيادة د. إيهاب</option><option value="Eye World Hospital">Eye World Hospital / مستشفى دنيا العيون</option></> : <><option value="Dermatology">Dermatology / الجلدية</option><option value="Dentistry">Dentistry / الأسنان</option></>}</select><input value={doctorForm.degree} onChange={e => setDoctorForm({ ...doctorForm, degree: e.target.value })} placeholder="Degree (consultant / specialist)" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><input value={doctorForm.specialty} onChange={e => setDoctorForm({ ...doctorForm, specialty: e.target.value })} placeholder="Specialty" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><input required value={doctorForm.branch} onChange={e => setDoctorForm({ ...doctorForm, branch: e.target.value })} placeholder="Branch / clinic" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><input value={doctorForm.phone} onChange={e => setDoctorForm({ ...doctorForm, phone: e.target.value })} placeholder="Doctor phone (optional)" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><input value={doctorForm.consultationFee} onChange={e => setDoctorForm({ ...doctorForm, consultationFee: e.target.value })} placeholder="Consultation fee (optional)" className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-bold"><Plus className="w-4 h-4" /> Add doctor</button></form></div>}

          <div className="glass-panel rounded-2xl border border-neutral-800 p-5 space-y-4"><div><h2 className="text-base font-extrabold text-white">Weekly availability</h2><p className="text-xs text-neutral-500 mt-1">Choose a doctor and define one recurring rule per weekday.</p></div><select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)} disabled={isDoctor} className="w-full px-3 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white"><option value="">Select doctor</option>{visibleDoctors.map(d => <option key={d.id} value={d.id}>{d.name} · {d.branch}</option>)}</select>{selectedDoctorId && <form onSubmit={handleSaveRule} className="space-y-2"><select value={ruleForm.dayOfWeek} onChange={e => setRuleForm({ ...ruleForm, dayOfWeek: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white">{weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}</select><div className="grid grid-cols-2 gap-2"><input type="time" value={ruleForm.startTime} onChange={e => setRuleForm({ ...ruleForm, startTime: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><input type="time" value={ruleForm.endTime} onChange={e => setRuleForm({ ...ruleForm, endTime: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /></div><input type="number" min="10" step="5" value={ruleForm.slotDurationMinutes} onChange={e => setRuleForm({ ...ruleForm, slotDurationMinutes: Number(e.target.value) })} className="w-full px-3 py-2 rounded-lg bg-neutral-950 border border-neutral-800 text-sm text-white" /><button disabled={!canManageDoctors && !isDoctor} className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold">Save weekly rule</button></form>}{availability.length > 0 && <div className="space-y-1 pt-2 border-t border-neutral-800">{availability.filter(r => r.isActive).map(rule => <div key={rule.id} className="flex justify-between text-[11px] text-neutral-400"><span>{weekdays[rule.dayOfWeek]}</span><span className="text-emerald-300">{rule.startTime}–{rule.endTime} · {rule.slotDurationMinutes}m</span></div>)}</div>}</div>

          <div className="rounded-2xl border border-amber-500/15 bg-amber-500/5 p-4"><p className="text-xs font-bold text-amber-300">Important setup note</p><p className="text-xs text-neutral-400 mt-1 leading-relaxed">Run the booking migration SQL before using this screen. Until doctors and weekly availability are entered, no slots will be generated.</p></div>
        </aside>
      </div>
    </div>
  );
}
