import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingRecord } from '../types';

interface CalendarViewProps {
  bookings: BookingRecord[];
}

const ROOM_COLORS: Record<string, { bar: string; text: string; dot: string }> = {
  'Bed space':   { bar: 'bg-cyan-500',    text: 'text-white', dot: 'bg-cyan-500' },
  'Solo room':   { bar: 'bg-violet-500',  text: 'text-white', dot: 'bg-violet-500' },
  'Couple room': { bar: 'bg-amber-500',   text: 'text-white', dot: 'bg-amber-500' },
  'Family room': { bar: 'bg-emerald-500', text: 'text-white', dot: 'bg-emerald-500' },
};

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

export default function CalendarView({ bookings }: CalendarViewProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);

  // Only Checked-in bookings
  const activeBookings = useMemo(
    () => bookings.filter((b) => b.status === 'Checked-in'),
    [bookings]
  );

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
  const leadingDays  = firstOfMonth.getDay(); // 0=Sun
  const totalDays    = lastOfMonth.getDate();
  const totalCells   = Math.ceil((leadingDays + totalDays) / 7) * 7;

  // Build flat array of cell dates (null = padding)
  const cellDates: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const dayNum = i - leadingDays + 1;
    if (dayNum < 1 || dayNum > totalDays) return null;
    return new Date(viewYear, viewMonth, dayNum);
  });

  // Split into weeks
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < cellDates.length; i += 7) {
    weeks.push(cellDates.slice(i, i + 7));
  }

  // Bookings active on a specific date
  const bookingsOnDate = (date: Date) =>
    activeBookings.filter((b) => {
      const ci = startOfDay(new Date(b.checkInDate));
      const co = startOfDay(new Date(b.checkOutDate));
      return date >= ci && date <= co;
    });

  // Should we render a bar starting at this cell?
  // Yes if: date == effective start (check-in OR first day of month) OR date is Sunday (new row)
  const shouldRenderBar = (booking: BookingRecord, date: Date): boolean => {
    const ci         = startOfDay(new Date(booking.checkInDate));
    const monthStart = startOfDay(firstOfMonth);
    const effective  = ci < monthStart ? monthStart : ci;
    return isSameDay(date, effective) || date.getDay() === 0;
  };

  // How many columns the bar spans from this date (capped to week end and month end)
  const spanCols = (booking: BookingRecord, date: Date): number => {
    const co       = startOfDay(new Date(booking.checkOutDate));
    const monthEnd = startOfDay(lastOfMonth);
    const end      = co > monthEnd ? monthEnd : co;
    const daysLeft    = Math.round((end.getTime() - date.getTime()) / 86400000);
    const toWeekEnd   = 6 - date.getDay();
    return Math.min(daysLeft, toWeekEnd) + 1;
  };

  const nightCount = (b: BookingRecord) =>
    Math.round(
      (startOfDay(new Date(b.checkOutDate)).getTime() -
       startOfDay(new Date(b.checkInDate)).getTime()) / 86400000
    );

  // Stats
  const todayActive = activeBookings.filter((b) => {
    const ci = startOfDay(new Date(b.checkInDate));
    const co = startOfDay(new Date(b.checkOutDate));
    const t  = startOfDay(today);
    return t >= ci && t <= co;
  }).length;

  // Padding day numbers for prev/next month display
  const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();
  const getPaddingDay = (cellIndex: number): number => {
    if (cellIndex < leadingDays) {
      return prevMonthLastDay - (leadingDays - 1 - cellIndex);
    }
    return cellIndex - leadingDays - totalDays + 1;
  };

  return (
    <div className="space-y-5 pt-16 lg:pt-0">

      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Calendar (*Under Development*)
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            Visual overview of checked-in borders and their stay duration
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-2 bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-100 dark:border-cyan-900/40 rounded-xl">
            <Users className="w-4 h-4 text-cyan-500" />
            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-400">
              {activeBookings.length} Checked-in
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-xl">
            <Calendar className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {todayActive} Staying Today
            </span>
          </div>
        </div>
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-5 flex-wrap">
        {Object.entries(ROOM_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <span className={`w-3 h-2 rounded-sm ${c.bar}`} />
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{type}</span>
          </div>
        ))}
      </div>

      {/* CALENDAR CARD */}
      <div className="bg-white dark:bg-[#151c27] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800/60">
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

        {/* ── THE ACTUAL CALENDAR TABLE ── */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse" style={{ minWidth: 560 }}>
            <thead>
              <tr>
                {DAY_LABELS.map((d, i) => (
                  <th
                    key={d}
                    className={`py-3 text-center text-xs font-semibold tracking-wide border-b border-slate-100 dark:border-slate-800/60 ${
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
                <tr key={wi} className="border-b border-slate-100 dark:border-slate-800/40 last:border-b-0">
                  {week.map((date, di) => {
                    const isCurrentMonth = !!date;
                    const isToday        = date ? isSameDay(date, today) : false;
                    const isWeekend      = di === 0 || di === 6;
                    const cellIndex      = wi * 7 + di;
                    const dayBookings    = date ? bookingsOnDate(date) : [];
                    const MAX_VISIBLE    = 3;
                    const visible        = dayBookings.slice(0, MAX_VISIBLE);
                    const overflow       = dayBookings.length - MAX_VISIBLE;

                    return (
                      <td
                        key={di}
                        className={`align-top border-r border-slate-100 dark:border-slate-800/40 last:border-r-0 p-0`}
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

                          {/* Booking bars — uses negative margin trick to span columns */}
                          <div className="space-y-0.5 overflow-visible">
                            {date &&
                              visible.map((booking) => {
                                if (!shouldRenderBar(booking, date)) return null;
                                const span   = spanCols(booking, date);
                                const colors = ROOM_COLORS[booking.roomType] ?? ROOM_COLORS['Bed space'];

                                return (
                                  <div
                                    key={booking.id}
                                    onClick={() => setSelectedBooking(booking)}
                                    title={`${booking.guestName} — ${booking.roomType} · ${nightCount(booking)} nights`}
                                    style={{
                                      // Expand the bar across `span` columns using calc
                                      // Each column is 1/7 of the table. We add (span-1) * full col width.
                                      width: `calc(${span * 100}% + ${(span - 1) * 8}px)`,
                                      position: 'relative',
                                      zIndex: 3,
                                    }}
                                    className={`
                                      flex items-center px-2 py-[3px] rounded-md cursor-pointer
                                      text-[10px] font-semibold truncate select-none
                                      hover:brightness-110 hover:shadow-md transition-all duration-150
                                      ${colors.bar} ${colors.text}
                                    `}
                                  >
                                    {booking.guestName}
                                  </div>
                                );
                              })}

                            {/* Overflow count */}
                            {date && overflow > 0 && (
                              <p className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold pl-1">
                                +{overflow} more
                              </p>
                            )}
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
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-sm bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
            >
              {/* Color accent bar */}
              <div className={`h-1.5 w-full ${ROOM_COLORS[selectedBooking.roomType]?.bar ?? 'bg-cyan-500'}`} />

              {/* Header */}
              <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${ROOM_COLORS[selectedBooking.roomType]?.dot ?? 'bg-cyan-500'}`} />
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">
                    Stay Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 ${ROOM_COLORS[selectedBooking.roomType]?.bar ?? 'bg-cyan-500'}`}>
                    {selectedBooking.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.guestName}</p>
                    <p className="text-[10px] text-gray-400">{selectedBooking.email || '—'}</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100 dark:bg-slate-800" />

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Room Type</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomType}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Room No.</p>
                    <p className="text-sm font-bold text-gray-900 dark:text-white">#{selectedBooking.roomNumber}</p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Check-In</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkInDate}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-black text-cyan-500">{nightCount(selectedBooking)}</p>
                      <p className="text-[9px] text-gray-400 font-semibold">nights</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-gray-400 uppercase tracking-wider font-bold mb-0.5">Check-Out</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkOutDate}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/40">
                  <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</span>
                  <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">
                    ₱{selectedBooking.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>

                {selectedBooking.contactNumber && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center font-mono">
                    📞 {selectedBooking.contactNumber}
                  </p>
                )}
              </div>

              <div className="px-5 pb-5">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}