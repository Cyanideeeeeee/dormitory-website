import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
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
  Users
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
  const chartAxis   = isDark ? '#64748b' : '#888888';
  const tooltipBg   = isDark ? '#1a2333' : '#ffffff';
  const tooltipBorder = isDark ? '#2d3f55' : '#e2e8f0';
  const tooltipText = isDark ? '#e2e8f0' : '#1e293b';
  // Filtering state
  const [dateFilter, setDateFilter] = useState<'7' | '14' | '30'>('7');
  const [roomCategoryFilter, setRoomCategoryFilter] = useState<'All' | RoomType>('All');
  const [localLoading, setLocalLoading] = useState(false);
  const [todayDate, setTodayDate] = useState(() => new Date().toISOString().split('T')[0]);

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
  }, [dateFilter, roomCategoryFilter]);

  // Derived Statistics based on current state & filters
  const filteredBookings = bookings.filter((b) => {
    if (roomCategoryFilter !== 'All' && b.roomType !== roomCategoryFilter) {
      return false;
    }
    return true;
  });

  // NEW BOOKING — only Pending bookings created today (deducts once admin checks them in)
  const newBookingsCount = filteredBookings.filter(
    (b) => b.status === 'Pending' && b.createdAt?.slice(0, 10) === todayDate
  ).length;

  // TODAY'S CHECK-IN — all bookings checked-in today regardless of when they were created
  const todayCheckinsCount = filteredBookings.filter(
    (b) => b.status === 'Checked-in' && b.checkedInAt?.slice(0, 10) === todayDate
  ).length;

  // TODAY'S CHECK-OUT — bookings where admin clicked Check-Out today
  const todayCheckoutsCount = filteredBookings.filter(
    (b) => b.status === 'Checked-out' && (b as any).checkedOutAt?.slice(0, 10) === todayDate
  ).length;

  // TODAY'S REVENUE — sum of all bookings created today (any status)
  const totalRevenue = filteredBookings
    .filter((b) => b.createdAt?.slice(0, 10) === todayDate)
    .reduce((sum, b) => sum + b.price, 0);

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

  // Chart 2: Booking Statistics (Revenue & Bookings Trend)
  // Let's filter the historical stats array to simulate different date ranges
  const filteredTimelineStats = bookingStats.slice(
    dateFilter === '7' ? -7 : dateFilter === '14' ? -14 : -30
  ).map(stat => {
    // If a roomType filter is applied, scale revenue/bookings down proportionally to represent selection
    if (roomCategoryFilter === 'Bed space') {
      return {
        ...stat,
        bookings: Math.round(stat.bookings * 0.3),
        revenue: Math.round(stat.revenue * 0.2),
      };
    } else if (roomCategoryFilter === 'Solo room') {
      return {
        ...stat,
        bookings: Math.round(stat.bookings * 0.4),
        revenue: Math.round(stat.revenue * 0.4),
      };
    } else if (roomCategoryFilter === 'Couple room') {
      return {
        ...stat,
        bookings: Math.round(stat.bookings * 0.3),
        revenue: Math.round(stat.revenue * 0.4),
      };
    } else if (roomCategoryFilter === 'Family room') {
      return {
        ...stat,
        bookings: Math.round(stat.bookings * 0.25),
        revenue: Math.round(stat.revenue * 0.35),
      };
    }
    return stat;
  });

  return (
    <div className="space-y-5 pb-12 pt-16 lg:pt-0">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold flex items-center gap-1.5">
            Good Day, Admin! <span>👋</span>
          </p>
        </div>
      </div>

      {/* INTERACTIVE FILTER BAR */}
      <div className="bg-white dark:bg-[#151c27] p-4 rounded-2xl border border-slate-200 dark:border-slate-600/80 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-500 shrink-0" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest font-display">
            Interactive Filters
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {/* Room type filter — scrollable on mobile */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0f141c] p-1 rounded-xl border border-slate-200 dark:border-slate-800/40 overflow-x-auto max-w-full">
            {(['All', 'Bed space', 'Solo room', 'Couple room', 'Family room'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setRoomCategoryFilter(cat)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  roomCategoryFilter === cat
                    ? 'bg-white dark:bg-[#1a2333] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date duration filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-[#0f141c] p-1 rounded-xl border border-slate-200 dark:border-slate-800/40 shrink-0">
            {(['7', '14', '30'] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  dateFilter === d
                    ? 'bg-white dark:bg-[#1a2333] text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {d} Days
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
              { label: 'Pending Booking', value: newBookingsCount, icon: <CalendarDays className="w-5 h-5 text-indigo-500" />, bg: 'bg-indigo-50 dark:bg-[#111721]', border: 'border-indigo-100 dark:border-slate-800' },
              { label: "Today's Check-In", value: todayCheckinsCount, icon: <ArrowRightLeft className="w-5 h-5 text-emerald-500 rotate-90" />, bg: 'bg-emerald-50 dark:bg-[#111721]', border: 'border-emerald-100 dark:border-slate-800' },
              { label: "Today's Check-Out", value: todayCheckoutsCount, icon: <ArrowRightLeft className="w-5 h-5 text-pink-500 -rotate-90" />, bg: 'bg-pink-50 dark:bg-[#111721]', border: 'border-pink-100 dark:border-slate-800' },
              { label: "Today's Revenue", value: `₱${totalRevenue.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`, icon: <Coins className="w-5 h-5 text-amber-500" />, bg: 'bg-amber-50 dark:bg-[#111721]', border: 'border-amber-100 dark:border-slate-800', small: true },
            ].map((card) => (
              <motion.div
                key={card.label}
                whileHover={{ y: -3, boxShadow: '0 8px 28px rgba(0,0,0,0.12)' }}
                whileTap={{ scale: 0.98 }}
                className="bg-white dark:bg-[#1a2333] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm flex flex-col justify-between h-32 sm:h-36 transition-all duration-200 cursor-pointer"
              >
                <div className={`p-2.5 rounded-xl border ${card.bg} ${card.border} self-start shadow-xs`}>
                  {card.icon}
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 dark:text-[#a0aec0] uppercase font-bold tracking-widest leading-tight">
                    {card.label}
                  </p>
                  <span className={`font-display font-black text-gray-900 dark:text-white tracking-tight ${card.small ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'}`}>
                    {card.value}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>

          {/* ROOM AVAILABILITY */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-widest text-gray-600 dark:text-gray-300 uppercase font-display">
              Room Availability
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Bed space', value: bedSpaceAvailable, color: 'text-cyan-600 dark:text-cyan-400' },
                { label: 'Solo room', value: soloRoomAvailable, color: 'text-violet-600 dark:text-violet-400' },
                { label: 'Couple room', value: coupleRoomAvailable, color: 'text-amber-600 dark:text-amber-400' },
                { label: 'Family room', value: familyRoomAvailable, color: 'text-emerald-600 dark:text-emerald-400' },
              ].map((room) => (
                <motion.div
                  key={room.label}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  className="bg-white dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col items-center justify-center text-center space-y-1.5 h-24 sm:h-28 shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold font-display">{room.label}</span>
                  <span className={`text-2xl sm:text-3xl font-display font-black ${room.color}`}>{room.value}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* ROOM STATISTICS CHART CONTAINER */}
          <div className="space-y-4">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-widest text-gray-600 dark:text-gray-300 uppercase font-display">
                Room Statistics
              </h2>
              <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                {dateFilter === '7'
                  ? (() => { const d = new Date(); d.setDate(d.getDate() - 6); return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – Today`; })()
                  : dateFilter === '14'
                  ? (() => { const d = new Date(); d.setDate(d.getDate() - 13); return `${d.toLocaleDateString('en-US',{month:'short',day:'numeric'})} – Today`; })()
                  : (() => { const now = new Date(); return `${now.toLocaleDateString('en-US',{month:'long'})} 1 – ${now.toLocaleDateString('en-US',{month:'long',day:'numeric'})}`; })()
                }
              </span>
            </div>

            <div className="bg-white dark:bg-[#0f141c] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-600/80 shadow-sm overflow-x-auto">
              {/* Legend + summary pills */}
              {(() => {
                const roomTypes = ['Bed space', 'Solo room', 'Couple room', 'Family room'] as const;
                const colors: Record<string, string> = {
                  'Bed space':   '#06b6d4',
                  'Solo room':   '#8b5cf6',
                  'Couple room': '#f59e0b',
                  'Family room': '#10b981',
                };

                // Build date range: 7/14 days = rolling back N days; 30 days = 1st of current month → today
                const now = new Date();
                const days = parseInt(dateFilter);
                const dateRange: string[] = [];

                if (dateFilter === '30') {
                  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                  const cursor = new Date(firstOfMonth);
                  while (cursor <= now) {
                    dateRange.push(cursor.toISOString().split('T')[0]);
                    cursor.setDate(cursor.getDate() + 1);
                  }
                } else {
                  for (let i = days - 1; i >= 0; i--) {
                    const d = new Date();
                    d.setDate(d.getDate() - i);
                    dateRange.push(d.toISOString().split('T')[0]);
                  }
                }

                // Count checked-in AND checked-out bookings per room type per day
                const chartData = dateRange.map((dateStr) => {
                  const label = new Date(dateStr + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  const entry: Record<string, any> = { date: label };
                  roomTypes.forEach((rt) => {
                    entry[`${rt}_in`] = bookings.filter(
                      (b) => b.roomType === rt && b.checkedInAt?.slice(0, 10) === dateStr
                    ).length;
                    entry[`${rt}_out`] = bookings.filter(
                      (b) => b.roomType === rt && (b as any).checkedOutAt?.slice(0, 10) === dateStr
                    ).length;
                  });
                  return entry;
                });

                // Summary totals
                const totalsIn: Record<string, number> = {};
                const totalsOut: Record<string, number> = {};
                roomTypes.forEach((rt) => {
                  totalsIn[rt] = chartData.reduce((s, d) => s + (d[`${rt}_in`] as number), 0);
                  totalsOut[rt] = chartData.reduce((s, d) => s + (d[`${rt}_out`] as number), 0);
                });

                const tickInterval = dateRange.length <= 7 ? 0 : dateRange.length <= 14 ? 1 : Math.floor(dateRange.length / 8);

                return (
                  <>
                    {/* Summary pills */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {roomTypes.map((rt) => (
                        <div
                          key={rt}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold"
                          style={{ background: colors[rt] + '18', border: `1px solid ${colors[rt]}40` }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ background: colors[rt] }} />
                          <span style={{ color: colors[rt] }}>{rt}</span>
                          <span style={{ color: colors[rt] }}>↑{totalsIn[rt]}</span>
                          <span style={{ color: colors[rt], opacity: 0.6 }}>↓{totalsOut[rt]}</span>
                        </div>
                      ))}
                    </div>
                    {/* Legend */}
                    <div className="flex items-center gap-5 mb-4 px-1">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                        <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#06b6d4', opacity: 0.9 }} />
                        Check-In (solid)
                      </span>
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-400">
                        <span className="w-3 h-2 rounded-sm inline-block" style={{ background: '#06b6d4', opacity: 0.35 }} />
                        Check-Out (faded)
                      </span>
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 8, left: -8, bottom: dateRange.length > 14 ? 40 : 20 }}
                        barCategoryGap="28%"
                        barGap={1}
                      >
                        <defs>
                          {roomTypes.map((rt) => (
                            <linearGradient key={`in-${rt}`} id={`grad-in-${rt.replace(/ /g, '')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors[rt]} stopOpacity={0.95} />
                              <stop offset="100%" stopColor={colors[rt]} stopOpacity={0.65} />
                            </linearGradient>
                          ))}
                          {roomTypes.map((rt) => (
                            <linearGradient key={`out-${rt}`} id={`grad-out-${rt.replace(/ /g, '')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={colors[rt]} stopOpacity={0.38} />
                              <stop offset="100%" stopColor={colors[rt]} stopOpacity={0.18} />
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="2 4" stroke={isDark ? '#1e2a3a' : '#e2e8f0'} vertical={false} />
                        <XAxis
                          dataKey="date"
                          tickLine={false}
                          axisLine={false}
                          interval={tickInterval}
                          angle={dateRange.length > 14 ? -40 : 0}
                          textAnchor={dateRange.length > 14 ? 'end' : 'middle'}
                          tick={{ fill: isDark ? '#4b5563' : '#94a3b8', fontSize: 10, fontWeight: 500 }}
                        />
                        <YAxis
                          allowDecimals={false}
                          tickLine={false}
                          axisLine={false}
                          width={24}
                          tick={{ fill: isDark ? '#4b5563' : '#94a3b8', fontSize: 10 }}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: '14px',
                            background: isDark ? '#0f141c' : '#ffffff',
                            border: `1px solid ${isDark ? '#1e2a3a' : '#e2e8f0'}`,
                            fontSize: '11px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
                            color: isDark ? '#e2e8f0' : '#1e293b',
                            padding: '10px 14px',
                          }}
                          itemStyle={{ paddingBlock: '2px' }}
                          cursor={{ fill: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
                          formatter={(value: number, name: string) => {
                            const isOut = (name as string).endsWith('_out');
                            const rtName = (name as string).replace(/_in$|_out$/, '');
                            return [`${value}`, `${rtName} ${isOut ? '↓ Check-Out' : '↑ Check-In'}`];
                          }}
                        />
                        {roomTypes.map((rt) => (
                          <Bar key={`${rt}_in`} dataKey={`${rt}_in`} name={`${rt}_in`}
                            fill={`url(#grad-in-${rt.replace(/ /g, '')})`} radius={[4, 4, 0, 0]} maxBarSize={11} />
                        ))}
                        {roomTypes.map((rt) => (
                          <Bar key={`${rt}_out`} dataKey={`${rt}_out`} name={`${rt}_out`}
                            fill={`url(#grad-out-${rt.replace(/ /g, '')})`} radius={[4, 4, 0, 0]} maxBarSize={11} />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </>
                );
              })()}
            </div>
          </div>

          {/* BOOK STATISTICS CHART CONTAINER */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h2 className="text-sm font-semibold tracking-widest text-gray-600 dark:text-gray-300 uppercase font-display">
                Book Statistics
              </h2>
              {roomCategoryFilter !== 'All' && (
                <span className="text-[10px] text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full font-bold">
                  Pro-rated: {roomCategoryFilter}
                </span>
              )}
            </div>

            <div className="bg-white dark:bg-[#141b25] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/70 shadow-sm">
              <div className="h-56 sm:h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredTimelineStats}
                    margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ec4899" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#ec4899" stopOpacity={0.01} />
                      </linearGradient>
                      <linearGradient id="colorBookings" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.01} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} opacity={0.8} />
                    <XAxis
                      dataKey="date"
                      stroke={chartAxis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke={chartAxis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke={chartAxis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        background: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        color: tooltipText,
                      }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                    <Area
                      yAxisId="left"
                      type="monotone"
                      dataKey="revenue"
                      stroke="#ec4899"
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                      name="Revenue (₱)"
                      strokeWidth={2}
                    />
                    <Area
                      yAxisId="right"
                      type="monotone"
                      dataKey="bookings"
                      stroke="#06b6d4"
                      fillOpacity={1}
                      fill="url(#colorBookings)"
                      name="Total Bookings"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}