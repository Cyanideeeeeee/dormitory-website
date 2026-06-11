import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from './lib/supabase';
import { BookingRecord, RoomRecord, DayBookingStat, BookingStatus, AppRole, UserProfile } from './types';
import LoginPage from './pages/login.tsx';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import BookingManagement from './components/BookingManagement';
import CalendarView from './components/CalendarView';
import AdminView, { PriceSettings } from './components/AdminView';
import ExportView from './components/ExportView';

import LoadingSpinner from './components/UI/LoadingSpinner';

const DARK_MODE_KEY = 'seafarers_admin_dm';

export default function App() {
  // ── Data state ───────────────────────────────────────────────
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [bookingStats, setBookingStats] = useState<DayBookingStat[]>([]);
  const [settings, setSettings] = useState<PriceSettings>({
    price_bed_space:   250,
    price_solo_room:   525,
    price_couple_room: 725,
    price_family_room: 950,
    key_deposit:       200,
  });

  // ── UI state ─────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'dashboard' | 'booking' | 'calendar' | 'admin' | 'export'>('dashboard');
  const [sessionStatus, setSessionStatus] = useState<'logged_in' | 'logged_out' | 'loading'>('loading');
  const [appLoading, setAppLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // ── Auth / Role state ────────────────────────────────────────
  const [userRole, setUserRole]       = useState<AppRole>('admin');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [adminAccounts, setAdminAccounts] = useState<UserProfile[]>([]);

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

  // ── Restore Supabase session on page load ────────────────────
  useEffect(() => {
    const isRefresh = sessionStorage.getItem('app_active');

    if (!isRefresh) {
      // Fresh tab/browser open → sign out and force login page
      supabase.auth.signOut().then(() => {
        setSessionStatus('logged_out');
      });
    } else {
      // Page refresh → restore existing Supabase session
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSessionStatus(session ? 'logged_in' : 'logged_out');
      });
    }

    // Mark tab as active — survives F5 refresh, but clears on tab/browser close
    sessionStorage.setItem('app_active', 'true');

    // Listen for auth state changes (login, logout, token expiry)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionStatus(session ? 'logged_in' : 'logged_out');
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
    await Promise.all([fetchBookings(), fetchRooms(), fetchBookingStats(), fetchSettings(), fetchCurrentProfile(), fetchAdminAccounts()]);
    setDataLoading(false);
  };

  // ── Fetch current user's profile + role ─────────────────────
  const fetchCurrentProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !data) return;

    const profile: UserProfile = {
      id: data.id,
      fullName: data.full_name ?? 'Admin',
      email: user.email ?? '',
      role: data.role ?? 'admin',
      createdAt: data.created_at ?? '',
    };
    setUserProfile(profile);
    setUserRole(profile.role);
  };

  // ── Fetch all admin accounts (superadmin only) ───────────────
  const fetchAdminAccounts = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data) return;

    const profiles: UserProfile[] = await Promise.all(
      data.map(async (row: any) => {
        // Fetch email from auth.users via RPC or just use what we have
        return {
          id: row.id,
          fullName: row.full_name ?? 'Admin',
          email: row.email ?? '',
          role: row.role ?? 'admin',
          createdAt: row.created_at ?? '',
        };
      })
    );
    setAdminAccounts(profiles);
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
      contactNumber: row.contact_number ?? '',
      paymentMode: row.payment_mode ?? 'Cash',
      referenceNumber: row.reference_number ?? '',
      roomType: row.room_type,
      roomNumber: row.room_number,
      checkInDate: row.check_in_date,
      checkOutDate: row.check_out_date,
      status: row.status,
      price: row.price,
      createdAt: row.created_at,
      checkedInAt: row.checked_in_at ?? null,
      checkedOutAt: row.checked_out_at ?? null,
      idImageUrl: row.id_image_url ?? null,
      checkInTime: row.check_in_time ?? '12:00',
      checkOutTime: row.check_out_time ?? '12:00',
      discountAmount: row.discount_amount ?? 0,
      keyDeposit: row.key_deposit ?? 0,
      refundAmount: row.refund_amount ?? 0,
      actualCheckOutDate: row.actual_check_out_date ?? null,
      overstayDays: row.overstay_days ?? 0,
      overstayPenalty: row.overstay_penalty ?? 0,
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

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('*');

    if (error) {
      console.error('Error fetching settings:', error.message);
      return;
    }

    const map: Record<string, number> = {};
    (data || []).forEach((row: any) => { map[row.key] = parseFloat(row.value); });

    setSettings({
      price_bed_space:   map['price_bed_space']   ?? 250,
      price_solo_room:   map['price_solo_room']   ?? 525,
      price_couple_room: map['price_couple_room'] ?? 725,
      price_family_room: map['price_family_room'] ?? 950,
      key_deposit:       map['key_deposit']       ?? 200,
    });
  };

  const handleSaveSettings = async (updated: PriceSettings) => {
    const upserts = Object.entries(updated).map(([key, value]) => ({ key, value }));
    const { error } = await supabase
      .from('settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw new Error(error.message);
    setSettings(updated);
  };

  // ── Save room slots → Supabase ───────────────────────────────
  const handleSaveRoomSlots = async (roomId: string, totalRooms: number) => {
    const room = rooms.find((r) => r.id === roomId);
    if (!room) return;
    const newAvailable = Math.max(0, totalRooms - room.occupiedRooms);
    const { error } = await supabase
      .from('rooms')
      .update({ total_rooms: totalRooms, available_rooms: newAvailable })
      .eq('id', roomId);
    if (error) throw new Error(error.message);
    await fetchRooms();
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
  const handleTabChange = (tab: 'dashboard' | 'booking' | 'calendar' | 'admin' | 'export') => {
    setAppLoading(true);
    setActiveTab(tab);
    setTimeout(() => setAppLoading(false), 250);
  };

  // ── Add booking → Supabase ───────────────────────────────────
  const handleAddBooking = async (newBooking: BookingRecord, idImageFile?: File | null) => {
    let idImageUrl: string | null = null;

    // Upload ID image to Supabase Storage if provided
    if (idImageFile) {
      const fileExt = idImageFile.name.split('.').pop();
      const filePath = `${newBooking.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('guest-ids')
        .upload(filePath, idImageFile, { upsert: true });

      if (uploadError) {
        console.error('Error uploading ID image:', uploadError.message);
        alert('Failed to upload ID image. Booking will be saved without it.');
      } else {
        const { data: urlData } = supabase.storage
          .from('guest-ids')
          .getPublicUrl(filePath);
        idImageUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from('bookings').insert({
      id: newBooking.id,
      guest_name: newBooking.guestName,
      email: newBooking.email,
      contact_number: newBooking.contactNumber || null,
      payment_mode: newBooking.paymentMode || 'Cash',
      reference_number: newBooking.referenceNumber || null,
      room_type: newBooking.roomType,
      room_number: newBooking.roomNumber,
      check_in_date: newBooking.checkInDate,
      check_out_date: newBooking.checkOutDate,
      check_in_time: newBooking.checkInTime || '12:00',
      check_out_time: newBooking.checkOutTime || '12:00',
      status: newBooking.status,
      price: newBooking.price,
      discount_amount: newBooking.discountAmount ?? 0,
      key_deposit: (newBooking as any).keyDeposit ?? 0,
      checked_in_at: newBooking.status === 'Checked-in' ? (newBooking.checkedInAt ?? new Date().toISOString()) : null,
      created_at: new Date().toISOString(),
      id_image_url: idImageUrl,
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
    if (status === 'Checked-in') {
      updatePayload.checked_in_at = nowISO;
      // Mirror the exact check-in time as the check-out time (HH:MM)
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      updatePayload.check_out_time = `${hh}:${mm}`;
    }
    if (status === 'Checked-out') {
      updatePayload.checked_out_at = nowISO;
      // Refund key deposit from today's revenue stat
      const booking = bookings.find((b) => b.id === id);
      if (booking) {
        const deposit = booking.keyDeposit ?? 0;
        if (deposit > 0) await updateTodayStats(-deposit, false);
      }
    }

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

  // ── Extend booking → Supabase ────────────────────────────────
  // Called from both normal extend and overstay-then-extend scenario.
  // When overstayPenalty is provided the guest is paying both the extension
  // cost AND the accumulated overstay penalty in one transaction.
  const handleExtendBooking = async (
    id: string,
    newCheckOut: string,
    extraPrice: number,
    extendPaymentMode: 'Cash' | 'GCash',
    extendReferenceNumber: string,
    overstayPenalty: number = 0,
  ) => {
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const totalExtra = extraPrice + overstayPenalty;

    const updatePayload: any = {
      check_out_date: newCheckOut,
      price: booking.price + totalExtra,
      payment_mode: extendPaymentMode,
      reference_number: extendPaymentMode === 'GCash' ? extendReferenceNumber : (booking.referenceNumber || null),
    };

    // If there was an overstay involved, record it on the booking record
    if (overstayPenalty > 0) {
      const checkedInDate = booking.checkInDate;
      const scheduledOut  = booking.checkOutDate; // old checkout before extension
      const bookedNights  = Math.max(1, Math.round(
        (new Date(scheduledOut).getTime() - new Date(checkedInDate).getTime()) / 86400000
      ));
      const today         = new Date().toISOString().split('T')[0];
      const actualNights  = Math.max(1, Math.round(
        (new Date(today).getTime() - new Date(checkedInDate).getTime()) / 86400000
      ));
      const overstayDays  = Math.max(0, actualNights - bookedNights);

      updatePayload.overstay_days    = overstayDays;
      updatePayload.overstay_penalty = overstayPenalty;
      updatePayload.actual_check_out_date = today; // records when overstay was detected
    }

    const { error } = await supabase
      .from('bookings')
      .update(updatePayload)
      .eq('id', id);

    if (error) {
      console.error('Error extending booking:', error.message);
      alert('Failed to extend booking. Please try again.');
      return;
    }

    // Credit extension cost to today's stats (no new booking count)
    if (extraPrice > 0)      await updateTodayStats(extraPrice, false);
    // Credit overstay penalty to today's stats if applicable
    if (overstayPenalty > 0) await updateTodayStats(overstayPenalty, false);

    await fetchAllData();
    playAlertSound();
  };

  // ── Early checkout → Supabase ─────────────────────────────────
  // Sets status to Checked-out, records the actual check-out date,
  // and stores the refund amount so revenue analytics deduct it automatically.
  const handleEarlyCheckout = async (id: string, actualCheckOutDate: string, refundAmount: number) => {
    const nowISO = new Date().toISOString();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'Checked-out',
        checked_out_at: nowISO,
        actual_check_out_date: actualCheckOutDate,
        refund_amount: refundAmount,
      })
      .eq('id', id);

    if (error) {
      console.error('Error processing early checkout:', error.message);
      alert('Failed to process early check-out. Please try again.');
      return;
    }

    // Free up the room slot
    await updateRoomOccupancy(booking.roomType, 'decrement');

    // Adjust today's revenue stats:
    // Deduct key deposit refund + early checkout refund
    const deposit = booking.keyDeposit ?? 0;
    const totalDeduction = deposit + refundAmount;
    if (totalDeduction > 0) await updateTodayStats(-totalDeduction, false);

    await fetchAllData();
    playAlertSound();
  };

  // ── Overstay checkout → Supabase ─────────────────────────────
  // Applies overstay penalty to the booking, marks as Checked-out,
  // records actual check-out date, and adds penalty revenue to stats.
  const handleOverstayCheckout = async (
    id: string,
    actualCheckOutDate: string,
    overstayDays: number,
    overstayPenalty: number,
  ) => {
    const nowISO  = new Date().toISOString();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) return;

    const { error } = await supabase
      .from('bookings')
      .update({
        status: 'Checked-out',
        checked_out_at: nowISO,
        actual_check_out_date: actualCheckOutDate,
        overstay_days: overstayDays,
        overstay_penalty: overstayPenalty,
        // Increase the stored price so reports reflect the total collected
        price: booking.price + overstayPenalty,
      })
      .eq('id', id);

    if (error) {
      console.error('Error processing overstay checkout:', error.message);
      alert('Failed to process overstay check-out. Please try again.');
      return;
    }

    // Free up the room slot
    await updateRoomOccupancy(booking.roomType, 'decrement');

    // Deduct key deposit from today's revenue stats (it's refunded to the guest)
    const deposit = booking.keyDeposit ?? 0;
    if (deposit > 0) await updateTodayStats(-deposit, false);

    // Add the overstay penalty to today's revenue
    if (overstayPenalty > 0) await updateTodayStats(overstayPenalty, false);

    await fetchAllData();
    playAlertSound();
  };

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
  const updateTodayStats = async (revenue: number, countBooking = true) => {
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
          bookings: data.bookings + (countBooking ? 1 : 0),
          revenue: data.revenue + revenue,
        })
        .eq('date', today);
    } else {
      await supabase.from('booking_stats').insert({
        date: today,
        bookings: countBooking ? 1 : 0,
        revenue,
        occupancy_rate: 0,
      });
    }
  };

  // ── Create admin account (superadmin only) ───────────────────
  const handleCreateAdminAccount = async (fullName: string, password: string): Promise<{ error?: string }> => {
    // Auto-generate a unique internal email from the full name
    const slug = fullName.trim().toLowerCase().replace(/\s+/g, '.');
    const generatedEmail = `${slug}.${Date.now()}@seafarers.local`;

    const { data, error } = await supabase.auth.signUp({ email: generatedEmail, password });
    if (error) return { error: error.message };
    if (!data.user) return { error: 'Failed to create user.' };

    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      full_name: fullName,
      email: generatedEmail,
      role: 'admin',
      created_at: new Date().toISOString(),
    });

    if (profileError) return { error: profileError.message };

    await fetchAdminAccounts();
    return {};
  };

  // ── Delete admin account (superadmin only) ───────────────────
  const handleDeleteAdminAccount = async (id: string): Promise<{ error?: string }> => {
    // Delete profile row (RLS will block deleting superadmin rows)
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) return { error: error.message };
    await fetchAdminAccounts();
    return {};
  };

  // ── Change own password ──────────────────────────────────────
  const handleChangePassword = async (newPassword: string): Promise<{ error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { error: error.message };
    return {};
  };

  // ── Auth handlers ────────────────────────────────────────────
  const handleLogin = () => setSessionStatus('logged_in');
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSessionStatus('logged_out');
    setBookings([]);
    setRooms([]);
    setBookingStats([]);
    setUserProfile(null);
    setAdminAccounts([]);
    setActiveTab('dashboard');
  };
  const handleToggleDark = () => setIsDark((prev) => !prev);

  // ── Login gate ───────────────────────────────────────────────
  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafbfc] dark:bg-[#090d14]">
        <LoadingSpinner label="Restoring session..." size="md" />
      </div>
    );
  }

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
        adminName={userProfile?.fullName ?? 'Admin'}
        userRole={userRole}
        onChangePassword={handleChangePassword}
      />

      <main className="lg:ml-64 min-h-screen p-4 sm:p-6 md:p-8 bg-grid-pattern">
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
                isDark={isDark}
              />
            )}
            {activeTab === 'booking' && (
              <BookingManagement
                bookings={bookings}
                rooms={rooms}
                settings={settings}
                onAddBooking={handleAddBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onExtendBooking={handleExtendBooking}
                onEarlyCheckout={handleEarlyCheckout}
                onOverstayCheckout={handleOverstayCheckout}
              />
            )}
            {activeTab === 'calendar' && (
              <CalendarView
                bookings={bookings}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onExtendBooking={handleExtendBooking}
              />
            )}
            {activeTab === 'admin' && (
              <AdminView
                settings={settings}
                onSaveSettings={handleSaveSettings}
                rooms={rooms}
                onSaveRoomSlots={handleSaveRoomSlots}
              />
            )}
            {activeTab === 'export' && (
              <ExportView
                bookings={bookings}
                rooms={rooms}
              />
            )}
          </motion.div>
        </div>
      </main>
    </div>
  );
}