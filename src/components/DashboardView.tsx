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

  // Calculate high-level card counts:
  // "new Booking" (originally 10)
  const newBookingsCount = filteredBookings.filter((b) => b.status === 'Pending').length;
  // "Today's check-in" (originally 50)
  const todayCheckinsCount = filteredBookings.filter((b) => b.status === 'Checked-in').length;
  // "Today's check-out" (originally 25)
  const todayCheckoutsCount = filteredBookings.filter((b) => b.status === 'Checked-out').length;
  
  // "Total Revenue" (originally ₱10,000.00 or derived)
  const totalRevenue = filteredBookings
    .filter((b) => b.status === 'Checked-in' || b.status === 'Checked-out')
    .reduce((sum, b) => sum + b.price, 0);

  // Calculate individual Room Availabilities dynamically from data
  // Standard total is 20 for each type
  const getAvailableRoomsCount = (type: RoomType) => {
    const roomInfo = rooms.find((r) => r.type === type);
    if (!roomInfo) return 10;
    
    // We can compute current active check-ins for this room type
    const activeCheckins = bookings.filter(
      (b) => b.roomType === type && b.status === 'Checked-in'
    ).length;
    
    // Max of total rooms vs checkins
    const count = Math.max(0, roomInfo.totalRooms - activeCheckins);
    return count;
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
    <div className="space-y-8 pb-12">
      {/* HEADER SECTION WITH SIMULATION & CONTROLS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#e1e5eb] dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold flex items-center gap-1.5">
            Good Day, Admin! <span>👋</span>
          </p>
        </div>
      </div>

      {/* INTERACTIVE FLOATING FILTER SHEET bar */}
      <div className="bg-white dark:bg-[#151c27] p-4 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-cyan-500" />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-widest font-display">
            Interactive Filters
          </span>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Room type filter */}
          <div className="flex items-center gap-1.5 bg-[#f1f3f6] dark:bg-[#0f141c] p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            {(['All', 'Bed space', 'Solo room', 'Couple room', 'Family room'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setRoomCategoryFilter(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  roomCategoryFilter === cat
                    ? 'bg-white dark:bg-[#1a2333] text-gray-950 dark:text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Date duration filter */}
          <div className="flex items-center gap-1 bg-[#f1f3f6] dark:bg-[#0f141c] p-1 rounded-xl border border-slate-200/40 dark:border-slate-800/40">
            <button
              onClick={() => setDateFilter('7')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === '7'
                  ? 'bg-white dark:bg-[#1a2333] text-gray-950 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-950 dark:hover:text-gray-200'
              }`}
            >
              7 Days
            </button>
            <button
              onClick={() => setDateFilter('14')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === '14'
                  ? 'bg-white dark:bg-[#1a2333] text-gray-950 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-950 dark:hover:text-gray-200'
              }`}
            >
              14 Days
            </button>
            <button
              onClick={() => setDateFilter('30')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                dateFilter === '30'
                  ? 'bg-white dark:bg-[#1a2333] text-gray-950 dark:text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-950 dark:hover:text-gray-200'
              }`}
            >
              30 Days
            </button>
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
          {/* STATS MATRIX CARD ROW - Exactly matches layout in image (4 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* CARD 1: New bookings */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#f1f3f6] dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-[#111721] rounded-xl border border-slate-200/40 dark:border-slate-800 shadow-xs">
                  <CalendarDays className="w-5 h-5 text-indigo-500" />
                </div>
                {/* Horizontal Action indicator matching picture's "three dots" */}
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-md">
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                </button>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-[#6c7686] dark:text-[#a0aec0] uppercase font-bold tracking-widest">
                  new Booking
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-display font-black text-gray-900 dark:text-white">
                    {newBookingsCount}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* CARD 2: Today's check-in */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#f1f3f6] dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-[#111721] rounded-xl border border-slate-200/40 dark:border-slate-800 shadow-xs">
                  <ArrowRightLeft className="w-5 h-5 text-emerald-500 rotate-90" />
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-md">
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                </button>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-[#6c7686] dark:text-[#a0aec0] uppercase font-bold tracking-widest">
                  Today's check-in
                </p>
                <span className="text-3xl font-display font-black text-gray-900 dark:text-white">
                  {todayCheckinsCount}
                </span>
              </div>
            </motion.div>

            {/* CARD 3: Today's check-out */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#f1f3f6] dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-[#111721] rounded-xl border border-slate-200/40 dark:border-slate-800 shadow-xs">
                  <ArrowRightLeft className="w-5 h-5 text-[#ff007f] -rotate-90" />
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-md">
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                </button>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-[#6c7686] dark:text-[#a0aec0] uppercase font-bold tracking-widest">
                  Today's check-out
                </p>
                <span className="text-3xl font-display font-black text-gray-900 dark:text-white">
                  {todayCheckoutsCount}
                </span>
              </div>
            </motion.div>

            {/* CARD 4: Total revenue */}
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-[#f1f3f6] dark:bg-[#1a2333] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 shadow-xs flex flex-col justify-between h-36 relative overflow-hidden group transition-all"
            >
              <div className="flex justify-between items-start">
                <div className="p-3 bg-white dark:bg-[#111721] rounded-xl border border-slate-200/40 dark:border-slate-800 shadow-xs">
                  <Coins className="w-5 h-5 text-amber-500" />
                </div>
                <button className="text-gray-400 hover:text-gray-600 dark:hover:text-white p-1 rounded-md">
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full mb-0.5"></span>
                  <span className="block w-1 h-1 bg-gray-400 dark:bg-gray-500 rounded-full"></span>
                </button>
              </div>
              <div className="mt-2">
                <p className="text-[10px] text-[#6c7686] dark:text-[#a0aec0] uppercase font-bold tracking-widest">
                  Today's Revenue
                </p>
                <span className="text-2xl font-display font-black text-gray-900 dark:text-white tracking-tight">
                  ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </motion.div>
          </div>

          {/* ROOM AVAILABILITY SUB-SECTION - Styled exactly as requested/mocked */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-widest text-[#535d6c] dark:text-gray-300 uppercase font-display">
              Room Availability
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
              {/* Core available Card 1: Bed space */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                className="bg-[#f1f3f6] dark:bg-[#1a2333] p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2 h-28 hover:shadow-xs transition-shadow"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold font-display">
                  Bed space
                </span>
                <span className="text-2xl font-display font-black text-gray-900 dark:text-white">
                  {bedSpaceAvailable}
                </span>
              </motion.div>

              {/* Core available Card 2: Solo room */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                className="bg-[#f1f3f6] dark:bg-[#1a2333] p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2 h-28 hover:shadow-xs transition-shadow"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold font-display">
                  Solo room
                </span>
                <span className="text-2xl font-display font-black text-gray-900 dark:text-white">
                  {soloRoomAvailable}
                </span>
              </motion.div>

              {/* Core available Card 3: Couple room */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                className="bg-[#f1f3f6] dark:bg-[#1a2333] p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2 h-28 hover:shadow-xs transition-shadow"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold font-display">
                  Couple room
                </span>
                <span className="text-2xl font-display font-black text-gray-900 dark:text-white">
                  {coupleRoomAvailable}
                </span>
              </motion.div>

              {/* Core available Card 4: Family room */}
              <motion.div
                whileHover={{ scale: 1.015 }}
                className="bg-[#f1f3f6] dark:bg-[#1a2333] p-6 rounded-2xl border border-slate-200/50 dark:border-slate-800/80 flex flex-col items-center justify-center text-center space-y-2 h-28 hover:shadow-xs transition-shadow"
              >
                <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold font-display">
                  Family room
                </span>
                <span className="text-2xl font-display font-black text-gray-900 dark:text-white">
                  {familyRoomAvailable}
                </span>
              </motion.div>
            </div>
          </div>

          {/* ROOM STATISTICS CHART CONTAINER */}
          <div className="space-y-4">
            <h2 className="text-sm font-semibold tracking-widest text-[#535d6c] dark:text-gray-300 uppercase font-display">
              Room Statistics
            </h2>

            <div className="bg-[#f1f3f6]/80 dark:bg-[#141b25] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/70 shadow-2xs">
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={roomStatsData}
                    margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} opacity={0.8} />
                    <XAxis
                      dataKey="name"
                      stroke={chartAxis}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis stroke={chartAxis} fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        background: tooltipBg,
                        border: `1px solid ${tooltipBorder}`,
                        fontSize: '11px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        color: tooltipText,
                      }}
                      itemStyle={{ paddingBlock: '2px', color: tooltipText }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
                    <Bar
                      dataKey="Occupied"
                      stackId="room"
                      fill="#06b6d4"
                      radius={[4, 4, 0, 0]}
                      name="Active Occupants"
                    />
                    <Bar
                      dataKey="Available"
                      stackId="room"
                      fill="#cbd5e1"
                      className="dark:fill-slate-700"
                      radius={[4, 4, 0, 0]}
                      name="Vacant Rooms"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* BOOK STATISTICS CHART CONTAINER */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold tracking-widest text-[#535d6c] dark:text-gray-300 uppercase font-display">
                Book Statistics
              </h2>
              {roomCategoryFilter !== 'All' && (
                <span className="text-[10px] text-cyan-600 bg-cyan-100 dark:text-cyan-400 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full font-bold">
                  Pro-rated: {roomCategoryFilter}
                </span>
              )}
            </div>

            <div className="bg-[#f1f3f6]/80 dark:bg-[#141b25] p-5 rounded-2xl border border-slate-200/50 dark:border-slate-800/70 shadow-2xs">
              <div className="h-72 w-full">
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