import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { BookingRecord, RoomRecord, DayBookingStat, BookingStatus } from './types';
import LoginPage from './pages/login.tsx';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import BookingManagement from './components/BookingManagement';
import LoadingSpinner from './components/UI/LoadingSpinner';

const DARK_MODE_KEY = 'seafarers_admin_dm';

export default function App() {
  // ── Data state ───────────────────────────────────────────────
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [bookingStats, setBookingStats] = useState<DayBookingStat[]>([]);

  // ── UI state ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'booking'>('dashboard');
  const [sessionStatus, setSessionStatus] = useState<'logged_in' | 'logged_out'>('logged_out');
  const [appLoading, setAppLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  // Prevents flashing the login page while we check for an existing session
  const [initializing, setInitializing] = useState(true);

  // ── Dark mode (UI preference — still kept in localStorage) ───
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(DARK_MODE_KEY);
      if (saved !== null) return JSON.parse(saved) === true;
    } catch {}
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    isDark ? root.classList.add('dark') : root.classList.remove('dark');
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(isDark));
  }, [isDark]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (localStorage.getItem(DARK_MODE_KEY) === null) setIsDark(mq.matches);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // ── Check for existing Supabase session on mount ────────────
  useEffect(() => {
    // getSession checks localStorage for a valid Supabase token
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setSessionStatus('logged_in');
      } else {
        setSessionStatus('logged_out');
      }
      setInitializing(false);
    });

    // Also listen for auth changes (login/logout from other tabs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setSessionStatus('logged_in');
      } else {
        setSessionStatus('logged_out');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Fetch all data when user logs in ────────────────────────
  useEffect(() => {
    if (sessionStatus === 'logged_in') {
      fetchAllData();
    }
  }, [sessionStatus]);

  const fetchAllData = async () => {
    setDataLoading(true);
    await Promise.all([fetchBookings(), fetchRooms(), fetchBookingStats()]);
    setDataLoading(false);
  };

  const fetchBookings = async () => {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bookings:', error.message);
      return;
    }

    const mapped: BookingRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      guestName: row.guest_name,
      email: row.email,
      roomType: row.room_type,
      roomNumber: row.room_number,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      status: row.status,
      price: row.price,
      createdAt: row.created_at,
      checkedInAt: row.checked_in_at ?? null,
      checkedOutAt: row.checked_out_at ?? null,
    }));
    setBookings(mapped);
  };

  const fetchRooms = async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching rooms:', error.message);
      return;
    }

    const mapped: RoomRecord[] = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      totalRooms: row.total_rooms,
      occupiedRooms: row.occupied_rooms,
      availableRooms: row.available_rooms,
      pricePerNight: row.price_per_night,
    }));
    setRooms(mapped);
  };

  const fetchBookingStats = async () => {
    const { data, error } = await supabase
      .from('booking_stats')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching booking stats:', error.message);
      return;
    }

    const mapped: DayBookingStat[] = (data || []).map((row: any) => ({
      date: row.date,
      bookings: row.bookings,
      revenue: row.revenue,
      occupancyRate: row.occupancy_rate,
    }));
    setBookingStats(mapped);
  };

  // ── Audio alert ──────────────────────────────────────────────
  const playAlertSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch {}
  };

  // ── Tab switching ────────────────────────────────────────────
  const handleTabChange = (tab: 'dashboard' | 'booking') => {
    setAppLoading(true);
    setActiveTab(tab);
    setTimeout(() => setAppLoading(false), 250);
  };

  // ── Add booking → Supabase ───────────────────────────────────
  const handleAddBooking = async (newBooking: BookingRecord) => {
    const { error } = await supabase.from('bookings').insert({
      id: newBooking.id,
      guest_name: newBooking.guestName,
      email: newBooking.email,
      room_type: newBooking.roomType,
      room_number: newBooking.roomNumber,
      check_in_date: newBooking.checkInDate,
      check_out_date: newBooking.checkOutDate,
      status: newBooking.status,
      price: newBooking.price,
      created_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error adding booking:', error.message);
      alert('Failed to create booking. Please try again.');
      return;
    }

    await updateRoomOccupancy(newBooking.roomType, 'increment');
    await updateTodayStats(newBooking.price);
    await fetchAllData();
    playAlertSound();
  };

  // ── Update booking status → Supabase ────────────────────────
  const handleUpdateBookingStatus = async (id: string, status: BookingStatus) => {
    const nowISO = new Date().toISOString();

    const updatePayload: any = { status };
    if (status === 'Checked-in') updatePayload.checked_in_at = nowISO;
    if (status === 'Checked-out') updatePayload.checked_out_at = nowISO;

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error updating booking status:', error.message);
      alert('Failed to update status. Please try again.');
      return;
    }

    const booking = bookings.find((b) => b.id === id);
    if (booking) {
      // Decrement when cancelling or checking out (frees the slot)
      if (
        (status === 'Checked-out' || status === 'Cancelled') &&
        (booking.status === 'Checked-in' || booking.status === 'Pending')
      ) {
        await updateRoomOccupancy(booking.roomType, 'decrement');
      }
      // Do NOT increment on Checked-in — slot was already occupied when booking was created (Pending)
    }

    await fetchAllData();
    playAlertSound();
  };

  // ── Room occupancy helper ────────────────────────────────────
  const updateRoomOccupancy = async (roomType: string, direction: 'increment' | 'decrement') => {
    const room = rooms.find((r) => r.type === roomType);
    if (!room) return;

    const delta = direction === 'increment' ? 1 : -1;
    const newOccupied = Math.max(0, Math.min(room.totalRooms, room.occupiedRooms + delta));
    const newAvailable = room.totalRooms - newOccupied;

    await supabase
      .from('rooms')
      .update({ occupied_rooms: newOccupied, available_rooms: newAvailable })
      .eq('id', room.id);
  };

  // ── Booking stats helper ─────────────────────────────────────
  const updateTodayStats = async (revenue: number) => {
    const today = new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

    const { data } = await supabase
      .from('booking_stats')
      .select('*')
      .eq('date', today)
      .single();

    if (data) {
      await supabase
        .from('booking_stats')
        .update({
          bookings: data.bookings + 1,
          revenue: data.revenue + revenue,
        })
        .eq('date', today);
    } else {
      await supabase.from('booking_stats').insert({
        date: today,
        bookings: 1,
        revenue,
        occupancy_rate: 0,
      });
    }
  };

  // ── Auth handlers ────────────────────────────────────────────
  const handleLogin = () => setSessionStatus('logged_in');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionStatus('logged_out');
    setBookings([]);
    setRooms([]);
    setBookingStats([]);
    setActiveTab('dashboard');
  };
  const handleToggleDark = () => setIsDark((prev) => !prev);

  // ── Initializing — wait for session check before rendering ──
  if (initializing) {
    return (
      <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090d14] flex items-center justify-center">
        <LoadingSpinner label="Loading..." size="md" />
      </div>
    );
  }

  // ── Login gate ───────────────────────────────────────────────
  if (sessionStatus === 'logged_out') {
    return <LoginPage onLogin={handleLogin} />;
  }

  // ── Main workspace ───────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#fafbfc] dark:bg-[#090d14] text-gray-800 dark:text-gray-200 transition-colors duration-300">
      <Sidebar
        activeTab={activeTab}
        onChangeTab={handleTabChange}
        isDark={isDark}
        onToggleDark={handleToggleDark}
        onLogout={handleLogout}
        adminName="Arnel Domondon"
      />

      <main className="ml-64 min-h-screen p-6 md:p-8 bg-grid-pattern">
        <div className="max-w-7xl mx-auto relative min-h-[500px]">

          {/* Initial DB loading overlay */}
          <AnimatePresence mode="wait">
            {dataLoading ? (
              <motion.div
                key="data-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#fafbfc]/90 dark:bg-[#090d14]/90 z-40 flex items-center justify-center rounded-2xl"
              >
                <LoadingSpinner label="Connecting to database..." size="md" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* Tab switch overlay */}
          <AnimatePresence mode="wait">
            {appLoading ? (
              <motion.div
                key="app-loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.95 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#fafbfc]/80 dark:bg-[#090d14]/85 backdrop-blur-3xs z-30 flex items-center justify-center rounded-2xl"
              >
                <LoadingSpinner label="Navigating workspace..." size="md" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            {activeTab === 'dashboard' && (
              <DashboardView
                bookings={bookings}
                rooms={rooms}
                bookingStats={bookingStats}
                isDark={isDark}
              />
            )}
            {activeTab === 'booking' && (
              <BookingManagement
                bookings={bookings}
                rooms={rooms}
                onAddBooking={handleAddBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}