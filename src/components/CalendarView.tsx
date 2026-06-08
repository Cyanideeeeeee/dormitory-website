import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users, AlertTriangle, Eye, X, User, Mail, Hash, Bed, CreditCard, CheckCircle2, XCircle, LogOut, CalendarPlus, ZoomIn, ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingRecord, BookingStatus } from '../types';

interface CalendarViewProps {
  bookings: BookingRecord[];
  onUpdateBookingStatus: (id: string, status: BookingStatus) => void;
  onExtendBooking: (id: string, newCheckOut: string, extraPrice: number, extendPaymentMode: 'Cash' | 'GCash', extendReferenceNumber: string) => void;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isOverdue(booking: BookingRecord): boolean {
  if (booking.status !== 'Checked-in') return false;
  const checkOutDay = booking.checkOutDate;
  const checkInTime = booking.checkedInAt ? new Date(booking.checkedInAt) : null;
  const hours   = checkInTime ? checkInTime.getHours()   : 12;
  const minutes = checkInTime ? checkInTime.getMinutes() : 0;
  const dueAt = new Date(`${checkOutDay}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
  return new Date() >= dueAt;
}

export default function CalendarView({ bookings, onUpdateBookingStatus, onExtendBooking }: CalendarViewProps) {
  const today = new Date();
  const [viewYear,  setViewYear]  = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  const [selectedDayBookings, setSelectedDayBookings] = useState<{ date: Date; bookings: BookingRecord[] } | null>(null);
  const [showExtend, setShowExtend] = useState(false);
  const [extendCheckOut, setExtendCheckOut] = useState('');
  const [extendPaymentMode, setExtendPaymentMode] = useState<'Cash' | 'GCash'>('Cash');
  const [extendReferenceNumber, setExtendReferenceNumber] = useState('');
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const KEY_DEPOSIT = 200;
  const ROOM_PRICES: Record<string, number> = {
    'Bed space': 250, 'Solo room': 525, 'Couple room': 825, 'Family room': 1200,
  };

  // Only Checked-in bookings appear on calendar
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Checked-in'),
    [bookings]
  );

  const overdueCount = useMemo(() => activeBookings.filter(isOverdue).length, [activeBookings]);

  // Navigation
  const goToPrev = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const goToNext = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };
  const goToToday = () => {
    setViewMonth(today.getMonth());
    setViewYear(today.getFullYear());
  };

  // Calendar math
  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth  = new Date(viewYear, viewMonth + 1, 0);
  const leadingDays  = firstOfMonth.getDay();
  const totalDays    = lastOfMonth.getDate();
  const totalCells   = Math.ceil((leadingDays + totalDays) / 7) * 7;

  const cellDates: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - leadingDays + 1;
    if (dayNum < 1 || dayNum > totalDays) return null;
    return new Date(viewYear, viewMonth, dayNum);
  });

  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cellDates.length; i += 7) weeks.push(cellDates.slice(i, i + 7));

  const bookingsOnDate = (date: Date) =>
    activeBookings.filter((b) => {
      const ci = startOfDay(new Date(b.checkInDate));
      const co = startOfDay(new Date(b.checkOutDate));
      return date >= ci && date <= co;
    });

  const shouldRenderBar = (booking: BookingRecord, date: Date): boolean => {
    const ci         = startOfDay(new Date(booking.checkInDate));
    const monthStart = startOfDay(firstOfMonth);
    const effective  = ci < monthStart ? monthStart : ci;
    return isSameDay(date, effective) || date.getDay() === 0;
  };

  const spanCols = (booking: BookingRecord, date: Date): number => {
    const co       = startOfDay(new Date(booking.checkOutDate));
    const monthEnd = startOfDay(lastOfMonth);
    const end      = co > monthEnd ? monthEnd : co;
    const daysLeft  = Math.round((end.getTime() - date.getTime()) / 86400000);
    const toWeekEnd = 6 - date.getDay();
    return Math.min(daysLeft, toWeekEnd) + 1;
  };

  const nightCount = (b: BookingRecord) =>
    Math.round(
      (startOfDay(new Date(b.checkOutDate)).getTime() -
       startOfDay(new Date(b.checkInDate)).getTime()) / 86400000
    );

  const todayActive = activeBookings.filter((b) => {
    const ci = startOfDay(new Date(b.checkInDate));
    const co = startOfDay(new Date(b.checkOutDate));
    const t  = startOfDay(today);
    return t >= ci && t <= co;
  }).length;

  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const getPaddingDay = (cellIndex: number): number => {
    if (cellIndex < leadingDays) return prevMonthLastDay - (leadingDays - 1 - cellIndex);
    return cellIndex - leadingDays - totalDays + 1;
  };

  return (
    <div className="space-y-5 pt-16 lg:pt-0">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Calendar
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            Visual overview of checked-in borders and their stay duration
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-xl">
            <Users className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {activeBookings.length} Checked-in
            </span>
          </div>
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {overdueCount} Overdue
              </span>
            </div>
          )}
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-5 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-emerald-500" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Checked-in (active stay)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-2 rounded-sm bg-rose-500" />
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Overdue (missed check-out)</span>
        </div>
      </div>

      {/* CALENDAR CARD */}
      <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-sm overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b-2 border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {MONTHS[viewMonth]} {viewYear}
            </h2>
            <button
              onClick={goToToday}
              className="px-2.5 py-1 text-[10px] font-bold bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
            >
              Today
            </button>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={goToPrev}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 dark:text-gray-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={goToNext}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-gray-400 dark:text-gray-500 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* CALENDAR TABLE */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                {DAY_LABELS.map((d, i) => (
                  <th
                    key={d}
                    className={`py-3 text-center text-xs font-semibold tracking-wide border-b-2 border-slate-200 dark:border-slate-700 ${
                      i === 0 || i === 6
                        ? 'text-gray-300 dark:text-gray-600'
                        : 'text-gray-400 dark:text-gray-500'
                    }`}
                    style={{ width: '14.2857%' }}
                  >
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((week, wi) => (
                <tr key={wi} className="border-b-2 border-slate-200 dark:border-slate-700 last:border-b-0">
                  {week.map((date, di) => {
                    const isCurrentMonth = !!date;
                    const isToday        = date ? isSameDay(date, today) : false;
                    const isWeekend      = di === 0 || di === 6;
                    const cellIndex      = wi * 7 + di;
                    const dayBookings    = date ? bookingsOnDate(date) : [];

                    return (
                      <td
                        key={di}
                        className="align-top border-r-2 border-slate-200 dark:border-slate-700 last:border-r-0 p-0"
                        style={{ verticalAlign: 'top', minHeight: 110 }}
                      >
                        <div
                          className={`h-full min-h-[110px] p-2 ${
                            !isCurrentMonth
                              ? 'bg-slate-50/60 dark:bg-[#0f141c]/60'
                              : isWeekend
                              ? 'bg-slate-50/30 dark:bg-slate-900/10'
                              : ''
                          }`}
                        >
                          {/* Day number */}
                          <div className="flex justify-center mb-1.5">
                            <span
                              className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold select-none ${
                                isToday
                                  ? 'bg-cyan-500 text-white font-bold'
                                  : isCurrentMonth
                                  ? isWeekend
                                    ? 'text-gray-400 dark:text-gray-500'
                                    : 'text-gray-700 dark:text-gray-300'
                                  : 'text-gray-300 dark:text-gray-700'
                              }`}
                            >
                              {isCurrentMonth
                                ? String(date!.getDate()).padStart(2, '0')
                                : String(getPaddingDay(cellIndex)).padStart(2, '0')}
                            </span>
                          </div>

                          {/* Booking bars */}
                          <div className="space-y-0.5 overflow-visible">
                            {date &&
                              dayBookings.map((booking) => {
                                if (!shouldRenderBar(booking, date)) return null;
                                const span     = spanCols(booking, date);
                                const overdue  = isOverdue(booking);
                                const barColor = overdue
                                  ? 'bg-rose-500 hover:bg-rose-600'
                                  : 'bg-emerald-500 hover:bg-emerald-600';

                                return (
                                  <div
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                    title={`${booking.guestName} — ${booking.roomType} · ${nightCount(booking)} nights${overdue ? ' · OVERDUE' : ''}`}
                                    style={{
                                      width: `calc(${span * 100}% + ${(span - 1) * 8}px)`,
                                      position: 'relative',
                                      zIndex: 3,
                                    }}
                                    className={`
                                      flex items-center px-2 py-[3px] rounded-md cursor-pointer
                                      text-[10px] font-semibold truncate select-none text-white
                                      shadow-sm transition-all duration-150
                                      ${barColor}
                                    `}
                                  >
                                    {overdue && <span className="mr-1 shrink-0">⚠</span>}
                                    {booking.guestName}
                                  </div>
                                );
                              })}


                          </div>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* EMPTY STATE */}
      {activeBookings.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
          </div>
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
            No checked-in borders this month
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Checked-in bookings will appear here as colored bars
          </p>
        </div>
      )}

      {/* DETAIL POPUP */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-md bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b-2 border-slate-300 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">
                    Border Details
                  </h2>
                  {isOverdue(selectedBooking) && (
                    <span className="text-[10px] font-bold bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full">
                      OVERDUE
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Booking ID + Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg">#{selectedBooking.id}</span>
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                    selectedBooking.status === 'Checked-in' ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400'
                    : selectedBooking.status === 'Checked-out' ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                    : selectedBooking.status === 'Cancelled' ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                    : 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400'
                  }`}>{selectedBooking.status}</span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <User className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Border Name</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.guestName}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Email</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.email || '—'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Contact Number</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{selectedBooking.contactNumber || '—'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Bed className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room Type</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomType}</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room No.</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomNumber}</p></div>
                    </div>
                  </div>
                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-In Date</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkInDate}</p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-Out Date</p>
                      <p className={`text-sm font-bold ${isOverdue(selectedBooking) ? 'text-rose-500 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>{selectedBooking.checkOutDate}</p></div>
                    </div>
                  </div>
                  {/* Times */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-In Time</p>
                      <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                        {selectedBooking.checkInTime ? (() => { const [h,m] = selectedBooking.checkInTime!.split(':').map(Number); return `${String(h%12||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; })() : '—'}
                      </p></div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-Out Time</p>
                      <p className="text-sm font-bold font-mono text-rose-500 dark:text-rose-400">
                        {selectedBooking.checkOutTime ? (() => { const [h,m] = selectedBooking.checkOutTime!.split(':').map(Number); return `${String(h%12||12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h>=12?'PM':'AM'}`; })() : '—'}
                      </p></div>
                    </div>
                  </div>
                  {/* Price breakdown */}
                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-300 dark:border-cyan-700 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-cyan-500 shrink-0" />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Price Breakdown</p>
                      </div>
                      {selectedBooking.paymentMode && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${selectedBooking.paymentMode === 'GCash' ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
                          {selectedBooking.paymentMode === 'GCash' ? '📱 GCash' : '💵 Cash'}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1.5 pt-1 border-t border-cyan-200 dark:border-cyan-900/50">
                      {(() => {
                        const discount = selectedBooking.discountAmount ?? 0;
                        const basePrice = selectedBooking.price - KEY_DEPOSIT + discount;
                        const nights = Math.max(1, Math.round((new Date(selectedBooking.checkOutDate).getTime() - new Date(selectedBooking.checkInDate).getTime()) / 86400000));
                        const pricePerNight = ROOM_PRICES[selectedBooking.roomType] ?? 0;
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">Room Price <span className="text-[10px] text-gray-400 font-normal">({nights}n × ₱{pricePerNight.toLocaleString()})</span></span>
                            <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100">₱{basePrice.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                          </div>
                        );
                      })()}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">Key Deposit <span className="text-[10px] text-gray-400 font-normal">(refundable)</span></span>
                        <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100">₱{KEY_DEPOSIT.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                      </div>
                      {(selectedBooking.discountAmount ?? 0) > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-bold">Discount Applied</span>
                          <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-400">− ₱{(selectedBooking.discountAmount??0).toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center justify-between border-t-2 border-cyan-300 dark:border-cyan-700 pt-2">
                      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Total</span>
                      <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">₱{selectedBooking.price.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                    </div>
                  </div>
                  {/* GCash ref */}
                  {selectedBooking.paymentMode === 'GCash' && selectedBooking.referenceNumber && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-300 dark:border-blue-700">
                      <Hash className="w-4 h-4 text-blue-500 shrink-0" />
                      <div><p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">GCash Reference No.</p>
                      <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{selectedBooking.referenceNumber}</p></div>
                    </div>
                  )}
                  {/* Valid ID */}
                  {selectedBooking.idImageUrl && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />Valid ID
                      </p>
                      <div className="relative group rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 cursor-pointer" onClick={() => setLightboxUrl(selectedBooking.idImageUrl!)}>
                        <img src={selectedBooking.idImageUrl} alt="Guest ID" className="w-full h-36 object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <ZoomIn className="w-6 h-6 text-white" />
                          <span className="text-white text-xs font-bold">Click to view</span>
                        </div>
                      </div>
                    </div>
                  )}
                  {/* Timestamps */}
                  <div className="space-y-1.5">
                    {selectedBooking.checkedInAt && (
                      <p className="text-[10px] text-emerald-500 font-semibold flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                        Checked-in at {new Date(selectedBooking.checkedInAt).toLocaleString('en-PH',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}
                      </p>
                    )}
                    {selectedBooking.checkedOutAt && (
                      <p className="text-[10px] text-blue-400 font-semibold flex items-center justify-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block shrink-0" />
                        Checked-out at {new Date(selectedBooking.checkedOutAt).toLocaleString('en-PH',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:true})}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer — action buttons mirrored from BookingManagement */}
              <div className="p-4 border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0e141d] space-y-2">
                {/* Extend Stay form */}
                {selectedBooking.status === 'Checked-in' && showExtend && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 space-y-3 mb-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" />Extend Stay
                    </p>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Check-Out Date</label>
                      <input type="date" min={selectedBooking.checkOutDate} value={extendCheckOut} onChange={(e) => setExtendCheckOut(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f141c] border border-amber-300 dark:border-amber-800 focus:outline-none focus:border-amber-500 rounded-lg text-gray-800 dark:text-gray-200 font-semibold" />
                    </div>
                    {extendCheckOut && extendCheckOut > selectedBooking.checkOutDate && (() => {
                      const extraNights = Math.round((new Date(extendCheckOut).getTime() - new Date(selectedBooking.checkOutDate).getTime()) / 86400000);
                      const pricePerNight = ROOM_PRICES[selectedBooking.roomType] ?? 0;
                      const extraCost = extraNights * pricePerNight;
                      return (
                        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#0f141c] rounded-lg border border-amber-200 dark:border-amber-900/40">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">+{extraNights} night{extraNights!==1?'s':''} × ₱{pricePerNight.toLocaleString()}</span>
                          <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">+₱{extraCost.toLocaleString(undefined,{minimumFractionDigits:2})}</span>
                        </div>
                      );
                    })()}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Payment Mode</label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Cash','GCash'] as const).map((mode) => (
                          <button key={mode} type="button" onClick={() => { setExtendPaymentMode(mode); setExtendReferenceNumber(''); }}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${extendPaymentMode===mode ? (mode==='GCash'?'bg-blue-500 border-blue-500 text-white':'bg-emerald-500 border-emerald-500 text-white') : 'bg-white dark:bg-[#0f141c] border-slate-200 dark:border-slate-800 text-gray-500'}`}>
                            {mode==='GCash'?'📱 GCash':'💵 Cash'}
                          </button>
                        ))}
                      </div>
                      {extendPaymentMode==='GCash' && (
                        <input type="text" placeholder="GCash Reference Number *" value={extendReferenceNumber} onChange={(e)=>setExtendReferenceNumber(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0f141c] border-2 border-blue-400 dark:border-blue-700 focus:outline-none focus:border-blue-500 rounded-lg text-gray-800 dark:text-gray-200 font-mono mt-1" />
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => {
                        if (!extendCheckOut || extendCheckOut <= selectedBooking.checkOutDate) { alert('Please select a new check-out date after the current one.'); return; }
                        if (extendPaymentMode==='GCash' && !extendReferenceNumber.trim()) { alert('Please enter the GCash Reference Number.'); return; }
                        const extraNights = Math.round((new Date(extendCheckOut).getTime()-new Date(selectedBooking.checkOutDate).getTime())/86400000);
                        const extraCost = extraNights * (ROOM_PRICES[selectedBooking.roomType]??0);
                        onExtendBooking(selectedBooking.id, extendCheckOut, extraCost, extendPaymentMode, extendReferenceNumber);
                        setShowExtend(false); setExtendCheckOut(''); setExtendPaymentMode('Cash'); setExtendReferenceNumber(''); setSelectedBooking(null);
                      }} className="py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors">Confirm Extend</button>
                      <button onClick={() => { setShowExtend(false); setExtendCheckOut(''); setExtendReferenceNumber(''); }}
                        className="py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors">Cancel</button>
                    </div>
                  </div>
                )}
                {/* Pending actions */}
                {selectedBooking.status === 'Pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { onUpdateBookingStatus(selectedBooking.id,'Checked-in'); setSelectedBooking(null); }}
                      className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />Check-In
                    </button>
                    <button onClick={() => { onUpdateBookingStatus(selectedBooking.id,'Cancelled'); setSelectedBooking(null); }}
                      className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <XCircle className="w-3.5 h-3.5" />Cancel Booking
                    </button>
                  </div>
                )}
                {/* Checked-in actions */}
                {selectedBooking.status === 'Checked-in' && !showExtend && (
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => { onUpdateBookingStatus(selectedBooking.id,'Checked-out'); setSelectedBooking(null); }}
                      className="py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <LogOut className="w-3.5 h-3.5" />Check-Out
                    </button>
                    <button onClick={() => { setExtendCheckOut(selectedBooking.checkOutDate); setShowExtend(true); }}
                      className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" />Extend Stay
                    </button>
                  </div>
                )}
                <button onClick={() => { setSelectedBooking(null); setShowExtend(false); setExtendCheckOut(''); setExtendReferenceNumber(''); }}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors">
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* DAY OVERFLOW MODAL */}
      <AnimatePresence>
        {selectedDayBookings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDayBookings(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">
                    {selectedDayBookings.date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">{selectedDayBookings.bookings.length} guest{selectedDayBookings.bookings.length !== 1 ? 's' : ''} staying</p>
                </div>
                <button
                  onClick={() => setSelectedDayBookings(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Guest list */}
              <div className="p-3 space-y-2 max-h-80 overflow-y-auto">
                {selectedDayBookings.bookings.map((booking) => {
                  const overdue = isOverdue(booking);
                  return (
                    <button
                      key={booking.id}
                      onClick={() => {
                        setSelectedDayBookings(null);
                        setSelectedBooking(booking);
                      }}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all hover:shadow-sm text-left bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                    >
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${overdue ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                        {booking.guestName.split(' ').slice(0, 2).map((n: string) => n[0]).join('')}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${overdue ? 'text-rose-500 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                          {overdue && '⚠ '}{booking.guestName}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{booking.roomType} · Room {booking.roomNumber}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-gray-400">
                          {nightCount(booking)}n
                        </p>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${overdue ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'}`}>
                          {overdue ? 'Overdue' : 'Active'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-4 pb-4">
                <button
                  onClick={() => setSelectedDayBookings(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>      {/* LIGHTBOX */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}>
            <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}}
              transition={{type:'spring',damping:25,stiffness:300}}
              className="relative max-w-3xl w-full" onClick={(e)=>e.stopPropagation()}>
              <button onClick={() => setLightboxUrl(null)}
                className="absolute -top-4 -right-4 z-10 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
              <img src={lightboxUrl} alt="ID Full View" className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]" />
              <p className="text-center text-white/50 text-xs mt-3 font-medium">Click outside or × to close</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}