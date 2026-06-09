import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import {
  CalendarDays,
  ArrowRightLeft,
  Coins,
  Bed,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  SlidersHorizontal,
  Users,
  BarChart2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingRecord, RoomRecord, DayBookingStat, RoomType } from '../types';
import LoadingSpinner from './UI/LoadingSpinner';

interface DashboardViewProps {
  bookings: BookingRecord[];
  rooms: RoomRecord[];
  bookingStats: DayBookingStat[];
  isDark?: boolean;
}

export default function DashboardView({
  bookings,
  rooms,
  bookingStats,
  isDark = false,
}: DashboardViewProps) {
  // ✅ FIX 3: Chart colors that respond to dark mode
  const chartGrid   = isDark ? 'rgba(255,255,255,0.06)' : '#e2e8f0';
  const chartAxis   = isDark ? '#cbd5e1' : '#888888';
  const tooltipBg   = isDark ? '#1a2333' : '#ffffff';
  const tooltipBorder = isDark ? '#2d3f55' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';
  // Filtering state
  const [roomCategoryFilter, setRoomCategoryFilter] = useState<'All' | RoomType>('All');
  const [localLoading, setLocalLoading] = useState(false);
  const [todayDate, setTodayDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Year filters — each chart has its own independent year selector (2026–2050)
  const currentYear = new Date().getFullYear();
  const START_YEAR = 2026;
  const END_YEAR = 2050;
  const availableYears = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  const [roomStatsYear, setRoomStatsYear] = useState(Math.max(START_YEAR, Math.min(END_YEAR, currentYear)));
  const [bookingStatsYear, setBookingStatsYear] = useState(Math.max(START_YEAR, Math.min(END_YEAR, currentYear)));
  const [revenueYear, setRevenueYear] = useState(Math.max(START_YEAR, Math.min(END_YEAR, currentYear)));

  // Refresh todayDate at midnight so stats reset automatically each day
  useEffect(() => {
    const msUntilMidnight = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      return midnight.getTime() - now.getTime();
    };
    const timer = setTimeout(() => {
      setTodayDate(new Date().toISOString().split('T')[0]);
    }, msUntilMidnight());
    return () => clearTimeout(timer);
  }, [todayDate]);

  // Trigger brief visual loader when filters are updated to emulate real-time DB fetches
  useEffect(() => {
    setLocalLoading(true);
    const timer = setTimeout(() => setLocalLoading(false), 350);
    return () => clearTimeout(timer);
  }, [roomCategoryFilter]);

  // Derived Statistics based on current state & filters
  const filteredBookings = bookings.filter((b) => {
    if (roomCategoryFilter !== 'All' && b.roomType !== roomCategoryFilter) {
      return false;
    }
    return true;
  });

  // PENDING BOOKING — all bookings currently in Pending status (mirrors Booking tab count)
  const newBookingsCount = filteredBookings.filter(
    (b) => b.status === 'Pending'
  ).length;

  // TODAY'S CHECK-IN — all bookings checked-in today regardless of when they were created
  const todayCheckinsCount = filteredBookings.filter(
    (b) => b.status === 'Checked-in' && b.checkedInAt?.slice(0, 10) === todayDate
  ).length;

  // TODAY'S CHECK-OUT — bookings where admin clicked Check-Out today
  const todayCheckoutsCount = filteredBookings.filter(
    (b) => b.status === 'Checked-out' && (b as any).checkedOutAt?.slice(0, 10) === todayDate
  ).length;

  // TODAY'S REVENUE —
  //   + price (minus deposit) for every booking checked-IN today  (money received today)
  //   - deposit for every booking checked-OUT today that was NOT also created today
  //     (deposit refunded today for a booking that was already counted on a prior day)
  const totalRevenue = (() => {
    // Bookings checked in today: count their price minus their own deposit (deposit held, not yet income)
    const checkedInToday = filteredBookings.filter(
      (b) => (b.status === 'Checked-in' || b.status === 'Checked-out') &&
              b.checkedInAt?.slice(0, 10) === todayDate
    );
    const income = checkedInToday.reduce((sum, b) => sum + b.price - (b.keyDeposit ?? 0), 0);

    // Bookings checked OUT today that were checked in on a PRIOR day:
    // their price was already counted on that prior day, so we only need to subtract the deposit refund
    const checkedOutTodayPrior = filteredBookings.filter(
      (b) => b.status === 'Checked-out' &&
              b.checkedOutAt?.slice(0, 10) === todayDate &&
              b.checkedInAt?.slice(0, 10) !== todayDate
    );
    const refunds = checkedOutTodayPrior.reduce((sum, b) => sum + (b.keyDeposit ?? 0), 0);

    return income - refunds;
  })();

  // Room Availability — deduct for Pending (reserved) AND Checked-in (occupied)
  const getAvailableRoomsCount = (type: RoomType) => {
    const roomInfo = rooms.find((r) => r.type === type);
    if (!roomInfo) return 10;
    const activeBookings = bookings.filter(
      (b) => b.roomType === type && (b.status === 'Pending' || b.status === 'Checked-in')
    ).length;
    return Math.max(0, roomInfo.totalRooms - activeBookings);
  };

  const bedSpaceAvailable = getAvailableRoomsCount('Bed space');
  const soloRoomAvailable = getAvailableRoomsCount('Solo room');
  const coupleRoomAvailable = getAvailableRoomsCount('Couple room');
  const familyRoomAvailable = getAvailableRoomsCount('Family room');

  // Chart 1: Room Occupancy Statistics
  const roomStatsData = rooms.map((r) => {
    const occupied = bookings.filter(
      (b) => b.roomType === r.type && b.status === 'Checked-in'
    ).length;
    const available = Math.max(0, r.totalRooms - occupied);
    return {
      name: r.type,
      Occupied: occupied,
      Available: available,
      Total: r.totalRooms,
    };
  });

  // Chart 2: Monthly Booking Statistics — check-ins per month, filtered by year + optional month
  const MONTH_LABELS = [ 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec' ] as const;
  const monthlyBookingData = MONTH_LABELS.map((month, idx) => {
    const monthStr = `${bookingStatsYear}-${String(idx + 1).padStart(2, '0')}`;
    const count = bookings.filter((b) => {
      const isConfirmed = b.status === 'Checked-in' || b.status === 'Checked-out';
      const checkedInMonth = (b.checkedInAt ?? b.createdAt ?? '').slice(0, 7);
      return isConfirmed && checkedInMonth === monthStr;
    }).length;
    return { month, count };
  });
  const totalYearBookings = monthlyBookingData.reduce((s, d) => s + d.count, 0);
  const peakBookingMonth = monthlyBookingData.reduce(
    (best, d) => (d.count > best.count ? d : best),
    monthlyBookingData[0]
  );

  // Chart 3: Monthly Revenue — derived from real checked-in/checked-out bookings, filtered by selected year
  const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ] as const;

  const monthlyRevenueData = MONTHS.map((month, idx) => {
    const monthStr = `${revenueYear}-${String(idx + 1).padStart(2, '0')}`;
    const revenue = bookings
      .filter((b) => {
        const isConfirmed = b.status === 'Checked-in' || b.status === 'Checked-out';
        const checkedInMonth = (b.checkedInAt ?? b.createdAt ?? '').slice(0, 7);
        return isConfirmed && checkedInMonth === monthStr;
      })
      .reduce((sum, b) => {
        // Key deposit is refundable — never counts as real revenue
        const deposit = b.keyDeposit ?? 0;
        return sum + b.price - deposit;
      }, 0);
    const checkIns = bookings.filter((b) => {
      const isConfirmed = b.status === 'Checked-in' || b.status === 'Checked-out';
      const checkedInMonth = (b.checkedInAt ?? b.createdAt ?? '').slice(0, 7);
      return isConfirmed && checkedInMonth === monthStr;
    }).length;
    return { month, revenue, checkIns };
  });

  const totalYearRevenue = monthlyRevenueData.reduce((s, d) => s + d.revenue, 0);
  const peakMonth = monthlyRevenueData.reduce(
    (best, d) => (d.revenue > best.revenue ? d : best),
    monthlyRevenueData[0]
  );

  return (
    <div className="space-y-5 pb-12 pt-16 lg:pt-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-200 dark:border-slate-700/80 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-950 dark:text-white font-display">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium flex items-center gap-1.5">
            Good Day, Admin! <span>👋</span>
          </p>
        </div>
      </div>

      {/* INTERACTIVE FILTER BAR */}
      <div className="bg-white dark:bg-[#151c27] p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest font-display">
            Filter by Room Type
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* Room type filter — scrollable on mobile */}
          <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-[#0a0f17] p-1 rounded-xl border border-slate-200 dark:border-slate-700 overflow-x-auto max-w-full">
            {(['All', 'Bed space', 'Solo room', 'Couple room', 'Family room'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setRoomCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roomCategoryFilter === cat
                    ? 'bg-white dark:bg-[#1e2d42] text-cyan-600 dark:text-cyan-400 shadow-sm font-bold ring-1 ring-cyan-200 dark:ring-cyan-900'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/60 dark:hover:bg-slate-800/40'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>


        </div>
      </div>

      {/* MAIN ANALYTICS VIEW CONTEXT */}
      <div className="relative">
        <AnimatePresence mode="wait">
          {localLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white/60 dark:bg-[#121820]/60 backdrop-blur-xs z-30 rounded-2xl flex items-center justify-center min-h-[400px]"
            >
              <LoadingSpinner label="Recalculating real-time stats..." />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <div className="space-y-8">
          {/* STATS CARDS — 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Pending Booking', value: newBookingsCount, icon: <CalendarDays className="w-5 h-5 text-indigo-500" />, iconBg: 'bg-indigo-50 dark:bg-indigo-950/40', iconBorder: 'border-indigo-200 dark:border-indigo-800', accent: 'bg-indigo-500' },
              { label: "Today's Check-In", value: todayCheckinsCount, icon: <ArrowRightLeft className="w-5 h-5 text-emerald-500 rotate-90" />, iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconBorder: 'border-emerald-200 dark:border-emerald-800', accent: 'bg-emerald-500' },
              { label: "Today's Check-Out", value: todayCheckoutsCount, icon: <ArrowRightLeft className="w-5 h-5 text-pink-500 -rotate-90" />, iconBg: 'bg-pink-50 dark:bg-pink-950/40', iconBorder: 'border-pink-200 dark:border-pink-800', accent: 'bg-pink-500' },
              { label: "Today's Revenue", value: `₱${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, icon: <Coins className="w-5 h-5 text-amber-500" />, iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconBorder: 'border-amber-200 dark:border-amber-800', accent: 'bg-amber-500', small: true },
            ].map((card) => (
              <motion.div
                key={card.label}
                whileHover={{ y: -2, boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}
                whileTap={{ scale: 0.98 }}
                className="relative bg-white dark:bg-[#1a2333] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm hover:shadow-md flex flex-col justify-between h-32 sm:h-36 transition-all duration-200 cursor-pointer overflow-hidden"
              >
                <div className={`absolute top-0 left-0 w-1 h-full ${card.accent} rounded-l-2xl opacity-70`} />
                <div className={`p-2.5 rounded-xl border ${card.iconBg} ${card.iconBorder} self-start`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-bold tracking-widest leading-tight mb-0.5">
                    {card.label}
                  </p>
                  <span className={`font-display font-black text-gray-900 dark:text-white tracking-tighter ${card.small ? 'text-xl sm:text-2xl' : 'text-2xl sm:text-4xl'}`}>
                    {card.value}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ROOM AVAILABILITY */}
          <div className="space-y-3">
            <h2 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase font-display flex items-center gap-2">
              <Bed className="w-3.5 h-3.5" />
              Room Availability
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bed space', value: bedSpaceAvailable, color: 'text-cyan-600 dark:text-cyan-400', ring: 'ring-cyan-200 dark:ring-cyan-900/60', dot: 'bg-cyan-500' },
                { label: 'Solo room', value: soloRoomAvailable, color: 'text-violet-600 dark:text-violet-400', ring: 'ring-violet-200 dark:ring-violet-900/60', dot: 'bg-violet-500' },
                { label: 'Couple room', value: coupleRoomAvailable, color: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-200 dark:ring-amber-900/60', dot: 'bg-amber-500' },
                { label: 'Family room', value: familyRoomAvailable, color: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-200 dark:ring-emerald-900/60', dot: 'bg-emerald-500' },
              ].map((room) => (
                <motion.div
                  key={room.label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className={`bg-white dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 ring-1 ${room.ring} flex flex-col items-center justify-center text-center space-y-1.5 h-24 sm:h-28 shadow-sm transition-all duration-200 cursor-pointer`}
                >
                  <span className="text-[11px] text-gray-500 dark:text-gray-400 font-semibold font-display">{room.label}</span>
                  <span className={`text-3xl sm:text-4xl font-display font-black tracking-tight ${room.color}`}>{room.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* MONTHLY ROOM STATISTICS CHART */}
          {(() => {
            const roomTypes = ['Bed space', 'Solo room', 'Couple room', 'Family room'] as const;
            const colors: Record<string, string> = {
              'Bed space':   '#06b6d4',
              'Solo room':   '#8b5cf6',
              'Couple room': '#f59e0b',
              'Family room': '#10b981',
            };
            const monthLabels = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

            const monthlyRoomData = monthLabels.map((month, idx) => {
              const monthStr = `${roomStatsYear}-${String(idx + 1).padStart(2, '0')}`;
              const entry: Record<string, any> = { month };
              roomTypes.forEach((rt) => {
                entry[rt] = bookings.filter((b) => {
                  const isCheckedIn = b.status === 'Checked-in' || b.status === 'Checked-out';
                  const bMonth = (b.checkedInAt ?? b.createdAt ?? '').slice(0, 7);
                  return isCheckedIn && b.roomType === rt && bMonth === monthStr;
                }).length;
              });
              return entry;
            });
            const roomTotals: Record<string, number> = {};
            roomTypes.forEach((rt) => {
              roomTotals[rt] = monthlyRoomData.reduce((s, d) => s + (d[rt] as number), 0);
            });

            return (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase font-display flex items-center gap-2">
                      <BarChart2 className="w-3.5 h-3.5 text-cyan-500" />
                      Monthly Room Statistics
                    </h2>
                    <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                      Check-ins per room type — {roomStatsYear}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Year pill strip */}
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a0f17] border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                      <button
                        onClick={() => setRoomStatsYear((y) => Math.max(availableYears[0], y - 1))}
                        disabled={roomStatsYear <= availableYears[0]}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                      </button>
                      <span className="px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-sm shadow-cyan-500/30 select-none min-w-[3.5rem] text-center">
                        {roomStatsYear}
                      </span>
                      <button
                        onClick={() => setRoomStatsYear((y) => Math.min(availableYears[availableYears.length - 1], y + 1))}
                        disabled={roomStatsYear >= availableYears[availableYears.length - 1]}
                        className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                      </button>
                    </div>
                    {/* Total summary chips */}
                    <div className="flex flex-wrap gap-2">
                      {roomTypes.map((rt) => (
                        <div key={rt} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                          style={{ background: isDark ? colors[rt] + '22' : colors[rt] + '18', border: `1px solid ${colors[rt]}55`, color: isDark ? '#ffffff' : colors[rt] }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: colors[rt] }} />
                          {rt}: {roomTotals[rt]}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chart card */}
                <div className="bg-white dark:bg-[#0f141c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-x-auto">
                  {/* Legend */}
                  <div className="flex flex-wrap items-center gap-4 mb-4 px-1">
                    {roomTypes.map((rt) => (
                      <span key={rt} className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                        <span className="w-3 h-2.5 rounded-sm inline-block" style={{ background: colors[rt] }} />
                        {rt}
                      </span>
                    ))}
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart
                      data={monthlyRoomData}
                      margin={{ top: 8, right: 8, left: -8, bottom: 4 }}
                      barCategoryGap="30%"
                      barGap={2}
                    >
                      <defs>
                        {roomTypes.map((rt) => (
                          <linearGradient key={rt} id={`mgrad-${rt.replace(/ /g,'')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor={colors[rt]} stopOpacity={0.95} />
                            <stop offset="100%" stopColor={colors[rt]} stopOpacity={0.60} />
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid
                        strokeDasharray="2 4"
                        stroke={isDark ? '#1e2a3a' : '#e2e8f0'}
                        vertical={false}
                      />
                      <XAxis
                        dataKey="month"
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11, fontWeight: 500 }}
                      />
                      <YAxis
                        allowDecimals={false}
                        tickLine={false}
                        axisLine={false}
                        width={24}
                        tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: '14px',
                          background: isDark ? '#1a2333' : '#ffffff',
                          border: `1px solid ${isDark ? '#2d3f55' : '#e2e8f0'}`,
                          fontSize: '11px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                          color: isDark ? '#f1f5f9' : '#1e293b',
                          padding: '10px 14px',
                        }}
                        labelStyle={{
                          fontWeight: 700,
                          fontSize: '12px',
                          color: isDark ? '#f1f5f9' : '#0f172a',
                          marginBottom: '4px',
                        }}
                        itemStyle={{
                          color: isDark ? '#e2e8f0' : '#334155',
                          fontWeight: 600,
                          paddingBlock: '2px',
                        }}
                        cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' }}
                        formatter={(value: number, name: string) => [`${value} check-in${value !== 1 ? 's' : ''}`, name]}
                      />
                      <Legend wrapperStyle={{ display: 'none' }} />
                      {roomTypes.map((rt) => (
                        <Bar
                          key={rt}
                          dataKey={rt}
                          name={rt}
                          fill={`url(#mgrad-${rt.replace(/ /g,'')})`}
                          radius={[5, 5, 0, 0]}
                          maxBarSize={18}
                        />
                      ))}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            );
          })()}

          {/* MONTHLY BOOKING STATISTICS CHART */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase font-display flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-cyan-500" />
                  Monthly Booking Statistics
                </h2>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                  January – December {bookingStatsYear}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Year pill strip */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a0f17] border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setBookingStatsYear((y) => Math.max(availableYears[0], y - 1))}
                    disabled={bookingStatsYear <= availableYears[0]}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-sm shadow-cyan-500/30 select-none min-w-[3.5rem] text-center">
                    {bookingStatsYear}
                  </span>
                  <button
                    onClick={() => setBookingStatsYear((y) => Math.min(availableYears[availableYears.length - 1], y + 1))}
                    disabled={bookingStatsYear >= availableYears[availableYears.length - 1]}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" />
                <span className="text-gray-500 dark:text-gray-400">{bookingStatsYear} Total:</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-black">
                  {totalYearBookings} check-in{totalYearBookings !== 1 ? 's' : ''}
                </span>
              </div>
              {totalYearBookings > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3 text-violet-500" />
                  <span className="text-gray-500 dark:text-gray-400">Peak:</span>
                  <span className="text-violet-600 dark:text-violet-400 font-black">
                    {peakBookingMonth.month} · {peakBookingMonth.count}
                  </span>
                </div>
              )}
              {roomCategoryFilter !== 'All' && (
                <span className="text-[10px] text-cyan-600 bg-cyan-50 dark:text-cyan-400 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full font-bold border border-cyan-200 dark:border-cyan-900">
                  {roomCategoryFilter}
                </span>
              )}
            </div>
          </div>

            <div className="bg-white dark:bg-[#141b25] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-violet-500 to-pink-400 rounded-t-2xl" />
              <div className="h-64 sm:h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyBookingData}
                    margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id="gradMonthlyBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0.7} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke={isDark ? '#1e2a3a' : '#e2e8f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      allowDecimals={false}
                      width={32}
                      tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }}
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', radius: 8 }}
                      contentStyle={{
                        borderRadius: '14px',
                        background: isDark ? '#1a2333' : '#ffffff',
                        border: `1.5px solid ${isDark ? '#2d3f55' : '#e2e8f0'}`,
                        fontSize: '11px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        padding: '10px 14px',
                      }}
                      labelStyle={{
                        fontWeight: 700,
                        marginBottom: '6px',
                        fontSize: '12px',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                      }}
                      itemStyle={{
                        color: isDark ? '#e2e8f0' : '#334155',
                        fontWeight: 600,
                        paddingBlock: '2px',
                      }}
                      formatter={(value: number) => [
                        `${value} check-in${value !== 1 ? 's' : ''}`,
                        'Bookings',
                      ]}
                    />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {monthlyBookingData.map((entry, index) => (
                        <Cell
                          key={`cell-bk-${index}`}
                          fill={entry.count > 0 ? 'url(#gradMonthlyBookings)' : (isDark ? '#1e2a3a' : '#f1f5f9')}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {totalYearBookings === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-1">
                    <TrendingUp className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      No check-ins recorded for {bookingStatsYear} yet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MONTHLY REVENUE CHART */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold tracking-widest text-gray-400 dark:text-gray-500 uppercase font-display flex items-center gap-2">
                  <BarChart2 className="w-3.5 h-3.5 text-emerald-500" />
                  Monthly Revenue
                </h2>
                <p className="text-sm font-bold text-gray-800 dark:text-gray-100 mt-0.5">
                  January – December {revenueYear}
                </p>
              </div>
              {/* Summary pills */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* Year pill strip */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0a0f17] border border-slate-200 dark:border-slate-700 rounded-xl p-1">
                  <button
                    onClick={() => setRevenueYear((y) => Math.max(availableYears[0], y - 1))}
                    disabled={revenueYear <= availableYears[0]}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <span className="px-3 py-1 rounded-lg text-xs font-black bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-sm shadow-emerald-500/30 select-none min-w-[3.5rem] text-center">
                    {revenueYear}
                  </span>
                  <button
                    onClick={() => setRevenueYear((y) => Math.min(availableYears[availableYears.length - 1], y + 1))}
                    disabled={revenueYear >= availableYears[availableYears.length - 1]}
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-gray-400 dark:text-gray-500 hover:bg-white dark:hover:bg-slate-700 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20 transition-all"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>

              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span className="text-gray-500 dark:text-gray-400">{revenueYear} Total:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-black">
                  ₱{totalYearRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>
              {totalYearRevenue > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide">
                  <TrendingUp className="w-3 h-3 text-amber-500" />
                  <span className="text-gray-500 dark:text-gray-400">Peak:</span>
                  <span className="text-amber-500 dark:text-amber-400 font-black">
                    {peakMonth.month} · ₱{peakMonth.revenue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

            <div className="bg-white dark:bg-[#141b25] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-sm overflow-hidden relative">
              {/* Gradient accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-500 rounded-t-2xl" />

              <div className="h-64 sm:h-80 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyRevenueData}
                    margin={{ top: 16, right: 16, left: 8, bottom: 4 }}
                    barCategoryGap="28%"
                  >
                    <defs>
                      <linearGradient id="gradMonthlyRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.95} />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id="gradMonthlyRevEmpty" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={isDark ? '#1e2a3a' : '#f1f5f9'} stopOpacity={1} />
                        <stop offset="100%" stopColor={isDark ? '#141b25' : '#e2e8f0'} stopOpacity={1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 4"
                      stroke={isDark ? '#1e2a3a' : '#e2e8f0'}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 11, fontWeight: 600 }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      width={56}
                      tick={{ fill: isDark ? '#cbd5e1' : '#64748b', fontSize: 10 }}
                      tickFormatter={(v) =>
                        v === 0 ? '₱0' : v >= 1000 ? `₱${(v / 1000).toFixed(0)}k` : `₱${v}`
                      }
                    />
                    <Tooltip
                      cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', radius: 8 }}
                      contentStyle={{
                        borderRadius: '14px',
                        background: isDark ? '#1a2333' : '#ffffff',
                        border: `1.5px solid ${isDark ? '#2d3f55' : '#e2e8f0'}`,
                        fontSize: '11px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
                        color: isDark ? '#f1f5f9' : '#1e293b',
                        padding: '10px 14px',
                      }}
                      labelStyle={{
                        fontWeight: 700,
                        marginBottom: '6px',
                        fontSize: '12px',
                        color: isDark ? '#f1f5f9' : '#0f172a',
                      }}
                      itemStyle={{
                        color: isDark ? '#e2e8f0' : '#334155',
                        fontWeight: 600,
                        paddingBlock: '2px',
                      }}
                      formatter={(value: number) => [
                        `₱${(value as number).toLocaleString(undefined, { minimumFractionDigits: 2 })}`,
                        'Revenue',
                      ]}
                    />
                    <Bar
                      dataKey="revenue"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    >
                      {monthlyRevenueData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.revenue > 0 ? 'url(#gradMonthlyRev)' : (isDark ? '#1e2a3a' : '#f1f5f9')}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Empty state hint */}
              {totalYearRevenue === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center space-y-1">
                    <BarChart2 className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto" />
                    <p className="text-xs text-gray-500 dark:text-gray-400 font-semibold">
                      No revenue recorded for 2026 yet
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}