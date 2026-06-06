import React, { useState } from 'react';
import {
  Search,
  Filter,
  Plus,
  X,
  CreditCard,
  User,
  Mail,
  Calendar,
  Bed,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Hash,
  Sparkles,
  ChevronRight,
  LogOut,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingRecord, BookingStatus, RoomRecord, RoomType } from '../types';

interface BookingManagementProps {
  bookings: BookingRecord[];
  rooms: RoomRecord[];
  onAddBooking: (booking: BookingRecord) => void;
  onUpdateBookingStatus: (id: string, status: BookingStatus) => void;
}

export default function BookingManagement({
  bookings,
  rooms,
  onAddBooking,
  onUpdateBookingStatus,
}: BookingManagementProps) {
  // Local UI lists/states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | BookingStatus>('All');
  const [selectedRoomType, setSelectedRoomType] = useState<'All' | RoomType>('All');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    // Default to current month in YYYY-MM format
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  
  // Quick booking modal standard toggle
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Details modal
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);
  
  // Simple form fields
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [formRoomType, setFormRoomType] = useState<RoomType>('Bed space');
  const [guestRoomNumber, setGuestRoomNumber] = useState('101');
  const todayStr = () => new Date().toISOString().split('T')[0];
  const tomorrowStr = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [checkIn, setCheckIn] = useState(todayStr);
  const [checkOut, setCheckOut] = useState(tomorrowStr);
  const [customPrice, setCustomPrice] = useState('');

  // Filtering list
  const filteredList = bookings.filter((b) => {
    // Search match
    const matchesSearch =
      b.guestName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.roomNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.id.toLowerCase().includes(searchQuery.toLowerCase());

    // Status filter
    const matchesStatus = selectedStatus === 'All' || b.status === selectedStatus;

    // Room type filter
    const matchesRoomType = selectedRoomType === 'All' || b.roomType === selectedRoomType;

    // Month filter — match against createdAt (YYYY-MM prefix)
    const matchesMonth = b.createdAt?.slice(0, 7) === selectedMonth;

    return matchesSearch && matchesStatus && matchesRoomType && matchesMonth;
  });

  // Fixed prices per room type
  const ROOM_PRICES: Record<string, number> = {
    'Bed space': 250,
    'Solo room': 525,
    'Couple room': 725,
    'Family room': 950,
  };

  // Calculate pricing based on fixed room type prices
  const computePrice = (roomType: RoomType, numNights: number = 1) => {
    return ROOM_PRICES[roomType] * numNights;
  };

  // Compute number of nights between two date strings
  const computeNights = (inDate: string, outDate: string): number => {
    const start = new Date(inDate);
    const end = new Date(outDate);
    const nights = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(1, nights);
  };

  // Live auto-computed price shown in the form
  const autoComputedPrice = computePrice(formRoomType, computeNights(checkIn, checkOut));

  // Submit Quick Booking handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !guestEmail) {
      alert('Please fill out guest name and email.');
      return;
    }

    // Use override price if provided, otherwise use auto-computed price
    const nights = computeNights(checkIn, checkOut);
    const computedPrice = parseFloat(customPrice) || computePrice(formRoomType, nights);

    const newBooking: BookingRecord = {
      id: `bk-${Date.now().toString().slice(-4)}`,
      guestName,
      email: guestEmail,
      roomType: formRoomType,
      roomNumber: guestRoomNumber || `${100 + Math.floor(Math.random() * 100)}`,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      status: 'Pending',
      price: computedPrice,
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
    };

    onAddBooking(newBooking);
    
    // Reset Form
    setGuestName('');
    setGuestEmail('');
    setFormRoomType('Bed space');
    setGuestRoomNumber('101');
    setCustomPrice('');
    setIsFormOpen(false);
  };

  // Icon selector based on status
  const getStatusIcon = (status: BookingStatus) => {
    switch (status) {
      case 'Checked-in':
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case 'Checked-out':
        return <LogOut className="w-4 h-4 text-blue-500" />;
      case 'Pending':
        return <HelpCircle className="w-4 h-4 text-amber-500" />;
      case 'Cancelled':
        return <XCircle className="w-4 h-4 text-rose-500" />;
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    const styles = {
      'Checked-in': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50',
      'Checked-out': 'bg-blue-50 text-blue-700 dark:bg-slate-800/80 dark:text-slate-300 border border-blue-100 dark:border-slate-800',
      'Pending': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50',
      'Cancelled': 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 pt-16 lg:pt-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Bookings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            Manage transient bookings, check-in status, and client logs
          </p>
        </div>

        {/* Create Booking Button */}
        <button
          id="btn-open-booking-form"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-xs shadow-cyan-500/25 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Booking</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-[#151c27] p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-gray-400 dark:text-gray-500" />
          <input
            id="input-booking-search"
            type="text"
            placeholder="Search guest name, email, or room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-gray-100/60 dark:bg-[#0f141c] border border-transparent dark:border-slate-800 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-[#111721] rounded-xl text-gray-800 dark:text-gray-200 transition-all font-semibold"
          />
        </div>

        {/* Month Filter */}
        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            id="select-filter-month"
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full text-xs font-bold bg-[#f1f3f6] dark:bg-[#0f141c] text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-1 focus:ring-cyan-500 py-2 px-3 rounded-xl cursor-pointer"
          />
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            id="select-filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full text-xs font-bold bg-[#f1f3f6] dark:bg-[#0f141c] text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-1 focus:ring-cyan-500 py-2 px-3 rounded-xl cursor-pointer"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Checked-in">Checked-in</option>
            <option value="Checked-out">Checked-out</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>

        {/* Room Type Filter */}
        <div className="flex items-center space-x-2">
          <Bed className="w-4 h-4 text-gray-400 shrink-0" />
          <select
            id="select-filter-roomtype"
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value as any)}
            className="w-full text-xs font-bold bg-[#f1f3f6] dark:bg-[#0f141c] text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-1 focus:ring-cyan-500 py-2 px-3 rounded-xl cursor-pointer"
          >
            <option value="All">All Room Types</option>
            <option value="Bed space">Bed space</option>
            <option value="Solo room">Solo room</option>
            <option value="Couple room">Couple room</option>
            <option value="Family room">Family room</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS TABLE */}
      <div className="bg-white dark:bg-[#151c27] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0f141c] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-200 dark:border-slate-800/60">
                <th className="py-4 px-6">ID & Guest</th>
                <th className="py-4 px-4">Room Alloc</th>
                <th className="py-4 px-4">Check In/Out</th>
                <th className="py-4 px-4">Cost / Night</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40 text-sm">
              <AnimatePresence initial={false}>
                {filteredList.map((bk) => (
                  <motion.tr
                    key={bk.id}
                    id={`booking-row-${bk.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    {/* Guest Name & ID */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-cyan-100 dark:bg-cyan-950/40 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                          {bk.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 dark:text-white text-sm">{bk.guestName}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <span className="font-mono text-[10px] bg-slate-100 dark:bg-slate-800 text-gray-500 dark:text-gray-400 py-0.5 px-1.5 rounded">
                              {bk.id}
                            </span>
                            <span className="truncate max-w-[150px]">{bk.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Room allocation */}
                    <td className="py-4 px-4">
                      <p className="font-semibold text-gray-800 dark:text-gray-200 text-sm">
                        Room {bk.roomNumber}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {bk.roomType}
                      </p>
                    </td>

                    {/* Dates */}
                    <td className="py-4 px-4">
                      <div className="text-xs">
                        <p className="font-semibold text-gray-700 dark:text-gray-300">
                          In: <span className="font-mono">{bk.checkInDate}</span>
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 font-medium">
                          Out: <span className="font-mono">{bk.checkOutDate}</span>
                        </p>
                      </div>
                    </td>

                    {/* Cost */}
                    <td className="py-4 px-4">
                      <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">
                        ₱{bk.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Badge */}
                    <td className="py-4 px-4">
                      {getStatusBadge(bk.status)}
                    </td>

                    {/* Interactive Action Menu */}
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Details button — always visible */}
                        <button
                          onClick={() => setSelectedBooking(bk)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>

                        {bk.status === 'Pending' && (
                          <>
                            <button
                              id={`btn-checkin-${bk.id}`}
                              onClick={() => onUpdateBookingStatus(bk.id, 'Checked-in')}
                              className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 dark:text-emerald-400 text-xs font-bold transition-all"
                            >
                              Check-In
                            </button>
                            <button
                              id={`btn-cancel-${bk.id}`}
                              onClick={() => onUpdateBookingStatus(bk.id, 'Cancelled')}
                              className="px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-500 dark:bg-rose-950/20 dark:hover:bg-rose-950/40 dark:text-rose-400 text-xs font-bold transition-all"
                            >
                              Cancel
                            </button>
                          </>
                        )}

                        {bk.status === 'Checked-in' && (
                          <button
                            id={`btn-checkout-${bk.id}`}
                            onClick={() => onUpdateBookingStatus(bk.id, 'Checked-out')}
                            className="px-2.5 py-1 rounded bg-cyan-50 hover:bg-cyan-100 text-cyan-600 dark:bg-cyan-950/20 dark:hover:bg-cyan-950/40 dark:text-cyan-400 text-xs font-bold transition-all"
                          >
                            Check-Out
                          </button>
                        )}

                        {(bk.status === 'Checked-out' || bk.status === 'Cancelled') && (
                          <span className="text-xs text-gray-400 dark:text-gray-600 font-semibold italic">
                            Archived
                          </span>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
                
                {filteredList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm font-semibold text-gray-400 dark:text-gray-500">
                          No bookings found for{' '}
                          {new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-xs text-gray-300 dark:text-gray-600">
                          Try selecting a different month or adjusting your filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK WORKSPACE SLIDE-OVER FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                className="w-screen max-w-md bg-white dark:bg-[#121822] h-full shadow-2xl flex flex-col justify-between overflow-y-auto"
              >
                {/* Form header */}
                <div className="p-6 border-b border-[#e1e5eb] dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">
                      Create Guest Booking
                    </h2>
                  </div>
                  <button
                    onClick={() => setIsFormOpen(false)}
                    className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Form body */}
                <form
                  onSubmit={handleFormSubmit}
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  {/* Guest name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Guest Full Name
                    </label>
                    <input
                      id="form-guest-name"
                      type="text"
                      required
                      placeholder="Guest Full Name"
                      value={guestName}
                      onChange={(e) => setGuestName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Guest email */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Guest Email Address
                    </label>
                    <input
                      id="form-guest-email"
                      type="email"
                      required
                      placeholder="Guest Email Address"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Room Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Bed className="w-3.5 h-3.5" />
                      Select Room Type
                    </label>
                    <select
                      id="form-room-type"
                      value={formRoomType}
                      onChange={(e) => {
                        const val = e.target.value as RoomType;
                        setFormRoomType(val);
                        // default numbers
                        if (val === 'Bed space') setGuestRoomNumber('101A');
                        else if (val === 'Solo room') setGuestRoomNumber('202');
                        else if (val === 'Couple room') setGuestRoomNumber('303');
                        else setGuestRoomNumber('404');
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 text-gray-700 dark:text-gray-300 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="Bed space">Bed space (Shared dormitory)</option>
                      <option value="Solo room">Solo room (Private cabin)</option>
                      <option value="Couple room">Couple room (Executive suite)</option>
                      <option value="Family room">Family room (2-3 pax)</option>
                    </select>
                  </div>

                  {/* Room Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Assigned Room / Bed Number
                    </label>
                    <input
                      id="form-room-number"
                      type="text"
                      placeholder="e.g. 104-B"
                      value={guestRoomNumber}
                      onChange={(e) => setGuestRoomNumber(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Checkin Checkout range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Check-In
                      </label>
                      <input
                        id="form-check-in"
                        type="date"
                        value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 text-gray-800 dark:text-gray-200 rounded-xl outline-none"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Check-Out
                      </label>
                      <input
                        id="form-check-out"
                        type="date"
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#0f141c] border border-slate-200 dark:border-slate-800 dark:border-slate-800 text-gray-800 dark:text-gray-200 rounded-xl outline-none"
                      />
                    </div>
                  </div>

                  {/* Auto-computed price preview */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Booking Price (PHP ₱)
                    </label>
                    {/* Live price display */}
                    <div className="w-full px-4 py-2.5 bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-900/50 rounded-xl flex items-center justify-between">
                      <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                        {computeNights(checkIn, checkOut)} night{computeNights(checkIn, checkOut) !== 1 ? 's' : ''} × ₱{ROOM_PRICES[formRoomType].toLocaleString()}
                      </span>
                      <span className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300">
                        ₱{(customPrice ? parseFloat(customPrice) : autoComputedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                  </div>

                  {/* Amenities */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-200/40 space-y-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />
                      Amenities
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {(
                        formRoomType === 'Couple room'
                          ? ['Wifi', 'Aircon', 'Free drinking water', 'Free parking', 'Smoking area', 'Canteen inside']
                          : formRoomType === 'Family room'
                          ? ['Wifi', 'Aircon', 'Own CR', 'Free drinking water', 'Free parking', 'Smoking area', 'Canteen inside']
                          : ['Wifi', 'Free drinking water', 'Free parking', 'Smoking area', 'Canteen inside']
                      ).map((amenity) => (
                        <li key={amenity} className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                          {amenity}
                        </li>
                      ))}
                    </ul>
                  </div>
                </form>

                {/* Form buttons */}
                <div className="p-6 border-t border-[#e1e5eb] dark:border-slate-800 bg-gray-55/40 dark:bg-[#0e141d] flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="w-1/2 py-3 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFormSubmit}
                    className="w-1/2 py-3 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-xl text-xs font-bold text-white transition-colors"
                  >
                    Create Booking
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOKING DETAILS MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBooking(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full max-w-md bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">
                    Booking Details
                  </h2>
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
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg">
                    #{selectedBooking.id}
                  </span>
                  {getStatusBadge(selectedBooking.status)}
                </div>

                {/* Guest info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <User className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Guest Name</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.guestName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                    <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Email</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <Bed className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room Type</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room No.</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-In</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkInDate}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-Out</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkOutDate}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-100 dark:border-cyan-900/40">
                    <CreditCard className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Total Price</p>
                      <p className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">
                        ₱{selectedBooking.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Check-in / Check-out timestamps */}
                <div className="space-y-1.5">
                  {selectedBooking.checkedInAt && (
                    <p className="text-[10px] text-emerald-500 font-semibold flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                      Checked-in at {new Date(selectedBooking.checkedInAt).toLocaleString('en-PH', {
                        month: 'short', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                      })}
                    </p>
                  )}
                  {selectedBooking.checkedOutAt && (
                    <p className="text-[10px] text-blue-400 font-semibold flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block shrink-0" />
                      Checked-out at {new Date(selectedBooking.checkedOutAt).toLocaleString('en-PH', {
                        month: 'short', day: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
                      })}
                    </p>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#0e141d]">
                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
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