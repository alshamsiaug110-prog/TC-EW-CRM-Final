import React, { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, ClipboardList, RefreshCw, RotateCcw, Stethoscope, XCircle } from 'lucide-react';
import { DatabaseService } from '../services/db';
import { Doctor, DoctorBookingRequest, SystemUser } from '../types';

type Props = { currentUser: SystemUser };

const statusStyle: Record<DoctorBookingRequest['requestStatus'], string> = {
  Requested: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
  Approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  'Needs Reschedule': 'border-sky-500/30 bg-sky-500/10 text-sky-300',
  Declined: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
  'Patient Confirmed': 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
  Canceled: 'border-neutral-700 bg-neutral-900 text-neutral-400',
};

export default function DoctorWorkspace({ currentUser }: Props) {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [requests, setRequests] = useState<DoctorBookingRequest[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const isOversight = currentUser.role === 'Admin' || currentUser.role === 'Organizer';

  const doctor = useMemo(() => currentUser.doctorId
    ? doctors.find(item => item.id === currentUser.doctorId)
    : doctors.find(item => item.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase()), [currentUser, doctors]);

  const refresh = async () => {
    setLoading(true);
    const freshDoctors = await DatabaseService.getDoctors();
    setDoctors(freshDoctors);
    const resolved = currentUser.doctorId
      ? freshDoctors.find(item => item.id === currentUser.doctorId)
      : freshDoctors.find(item => item.name.trim().toLowerCase() === currentUser.name.trim().toLowerCase());
    setRequests(isOversight ? await DatabaseService.getDoctorBookingRequests() : resolved ? await DatabaseService.getDoctorBookingRequests({ doctorId: resolved.id }) : []);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 10000);
    return () => window.clearInterval(timer);
  }, [currentUser.doctorId, currentUser.name]);

  const respond = async (request: DoctorBookingRequest, status: 'Approved' | 'Needs Reschedule' | 'Declined') => {
    const result = await DatabaseService.respondToDoctorBookingRequest(request, status, notes[request.id] || '', currentUser);
    if (!result.success) {
      setNotice({ type: 'error', text: result.error || 'تعذر حفظ قرار الطبيب.' });
      return;
    }
    setNotice({ type: 'success', text: 'تم إرسال القرار إلى ملف المريض والفريق المتابع.' });
    await refresh();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6" dir="rtl">
      <section className="glass-panel rounded-2xl border border-neutral-800 p-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20"><Stethoscope className="w-7 h-7 text-emerald-400" /></div>
          <div>
            <p className="text-[11px] tracking-[0.2em] text-emerald-400 font-bold uppercase">Doctor Request Desk</p>
            <h1 className="text-2xl font-extrabold text-white mt-1">واجهة طلبات الطبيب</h1>
            <p className="text-sm text-neutral-500 mt-1">تستقبل طلب الموعد، تضيف قرارك أو ملاحظتك، ويعود الرد فورًا للفريق وملف المريض.</p>
          </div>
        </div>
        <button onClick={refresh} className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-bold text-neutral-200"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث الطلبات</button>
      </section>

      {notice && <div className={`rounded-xl border px-4 py-3 text-sm font-semibold ${notice.type === 'success' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-rose-500/10 text-rose-300 border-rose-500/20'}`}>{notice.text}</div>}

      {!doctor && !isOversight ? (
        <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-7 text-right"><h2 className="text-base font-extrabold text-amber-300">لم يتم ربط حساب الطبيب بملف طبيب بعد</h2><p className="text-sm text-neutral-400 mt-2">يجب على الإدارة ربط حساب المستخدم بـ doctorId أو مطابقة اسم المستخدم مع اسم الطبيب داخل قائمة الأطباء. لن تظهر أي ملفات مرضى قبل هذا الربط.</p></section>
      ) : (
        <>
          <section className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><p className="text-sm font-extrabold text-white">{isOversight ? 'إشراف الإدارة على دورة الطبيب' : doctor?.name}</p><p className="text-xs text-neutral-400 mt-1">{isOversight ? 'كل الطلبات عبر المؤسسات والأقسام والأطباء.' : `${doctor?.clinic} · ${doctor?.department} · ${doctor?.specialty || 'Specialty not set'}`}</p></div><span className="text-xs font-bold text-emerald-300">{requests.filter(request => request.requestStatus === 'Requested').length} طلب جديد</span></section>

          <section className="space-y-4">
            {requests.length === 0 ? <div className="glass-panel rounded-2xl border border-neutral-800 p-12 text-center text-neutral-500"><ClipboardList className="w-9 h-9 mx-auto text-neutral-700 mb-3" /><p className="font-bold text-neutral-300">لا توجد طلبات مرتبطة بك حاليًا</p><p className="text-xs mt-1">سيظهر أي طلب جديد من Meta أو Call Center هنا تلقائيًا.</p></div> : requests.map(request => <article key={request.id} className="glass-panel rounded-2xl border border-neutral-800 p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3"><div><div className="flex items-center gap-2 flex-wrap"><h2 className="text-lg font-extrabold text-white">{request.patientName}</h2><span className={`text-[10px] px-2 py-1 rounded-full border font-bold ${statusStyle[request.requestStatus]}`}>{request.requestStatus}</span></div><p className="text-xs text-neutral-400 mt-1" dir="ltr">{request.patientPhone} · {request.requestedDate} · {request.requestedStartTime}–{request.requestedEndTime}</p><p className="text-xs text-neutral-500 mt-1">أُنشئ بواسطة {request.createdBy} ({request.createdByRole})</p></div><CalendarCheck className="w-5 h-5 text-emerald-400" /></div>
              {request.requestNote && <div className="rounded-xl border border-neutral-800 bg-neutral-950/60 px-4 py-3"><p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">سياق المريض</p><p className="text-sm text-neutral-300 mt-1">{request.requestNote}</p></div>}
              {request.requestStatus === 'Requested' && !isOversight ? <><textarea value={notes[request.id] || ''} onChange={event => setNotes({ ...notes, [request.id]: event.target.value })} rows={3} placeholder="اكتب ملاحظة للطرف المتابع أو سبب إعادة الجدولة..." className="w-full rounded-xl bg-neutral-950 border border-neutral-800 px-4 py-3 text-sm text-white placeholder:text-neutral-700 focus:outline-none focus:ring-1 focus:ring-emerald-500" /><div className="grid grid-cols-1 sm:grid-cols-3 gap-2"><button onClick={() => respond(request, 'Approved')} className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-3 text-xs font-extrabold text-white"><CheckCircle2 className="w-4 h-4" /> موافقة</button><button onClick={() => respond(request, 'Needs Reschedule')} className="flex items-center justify-center gap-2 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 py-3 text-xs font-extrabold text-sky-200"><RotateCcw className="w-4 h-4" /> إعادة جدولة</button><button onClick={() => respond(request, 'Declined')} className="flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 py-3 text-xs font-extrabold text-rose-200"><XCircle className="w-4 h-4" /> اعتذار</button></div></> : <div className="rounded-xl border border-neutral-800 bg-neutral-950/40 px-4 py-3"><p className="text-[10px] font-bold text-neutral-500">{request.requestStatus === 'Requested' ? 'طلب بانتظار قرار الطبيب' : 'آخر رد طبي'}</p><p className="text-sm text-neutral-200 mt-1">{request.doctorResponseNote || (request.requestStatus === 'Requested' ? 'لم يصدر الطبيب قرارًا بعد.' : 'لا توجد ملاحظة مضافة.')}</p>{request.respondedBy && <p className="text-[11px] text-neutral-500 mt-2">بواسطة {request.respondedBy} · {request.respondedAt ? new Date(request.respondedAt).toLocaleString() : ''}</p>}</div>}
            </article>) }
          </section>
        </>
      )}
    </div>
  );
}
