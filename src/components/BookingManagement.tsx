import React, { useState, useRef, useEffect } from 'react';
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
  Eye,
  ImageIcon,
  Upload,
  ZoomIn,
  CalendarPlus,
  Camera,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BookingRecord, BookingStatus, RoomRecord, RoomType } from '../types';
import { PriceSettings } from './AdminView';

interface BookingManagementProps {
  bookings: BookingRecord[];
  rooms: RoomRecord[];
  settings: PriceSettings;
  onAddBooking: (booking: BookingRecord, idImageFile?: File | null) => void;
  onUpdateBookingStatus: (id: string, status: BookingStatus) => void;
  onExtendBooking: (id: string, newCheckOut: string, extraPrice: number, extendPaymentMode: 'Cash' | 'GCash', extendReferenceNumber: string, overstayPenalty?: number) => void;
  onEarlyCheckout: (id: string, actualCheckOutDate: string, refundAmount: number) => void;
  onOverstayCheckout: (id: string, actualCheckOutDate: string, overstayDays: number, overstayPenalty: number) => void;
}

export default function BookingManagement({
  bookings,
  rooms,
  settings,
  onAddBooking,
  onUpdateBookingStatus,
  onExtendBooking,
  onEarlyCheckout,
  onOverstayCheckout,
}: BookingManagementProps) {
  // Local UI lists/states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'All' | BookingStatus>('All');
  const [selectedRoomType, setSelectedRoomType] = useState<'All' | RoomType>('All');
  const [selectedDate, setSelectedDate] = useState<string>(''); // '' = no filter; YYYY-MM-DD = specific day
  const [dateWarnMsg, setDateWarnMsg] = useState<string>(''); // shown when admin picks a future date

  // Pagination
  const ITEMS_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  
  // Quick booking modal standard toggle
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Details modal
  const [selectedBooking, setSelectedBooking] = useState<BookingRecord | null>(null);

  // Extend stay state
  const [showExtend, setShowExtend] = useState(false);
  const [extendCheckOut, setExtendCheckOut] = useState('');
  const [extendPaymentMode, setExtendPaymentMode] = useState<'Cash' | 'GCash'>('Cash');
  const [extendReferenceNumber, setExtendReferenceNumber] = useState('');

  // Early check-out confirmation state
  const [showEarlyCheckout, setShowEarlyCheckout] = useState(false);

  // Overstay check-out confirmation state
  const [showOverstayCheckout, setShowOverstayCheckout] = useState(false);

  // Extend stay confirmation modal state
  const [showExtendConfirm, setShowExtendConfirm] = useState(false);
  // When extending from an overstay context, carry the pending penalty into the confirm modal
  const [pendingOverstayPenaltyForExtend, setPendingOverstayPenaltyForExtend] = useState(0);
  
  // Simple form fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [contactNumber, setContactNumber] = useState('');
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

  // Helper: get current HH:MM string
  const getCurrentTimeStr = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };

  const [checkInTime, setCheckInTime] = useState(getCurrentTimeStr);
  // Check-out time mirrors check-in time by default
  const [checkOutTime, setCheckOutTime] = useState(getCurrentTimeStr);
  // Track whether user has manually changed check-out time independently
  const checkOutTimeManualRef = useRef(false);
  const [customPrice, setCustomPrice] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'Cash' | 'GCash'>('Cash');
  const [referenceNumber, setReferenceNumber] = useState('');

  // ID image upload state
  const [idImageFile, setIdImageFile] = useState<File | null>(null);
  const [idImagePreview, setIdImagePreview] = useState<string | null>(null);
  const idFileInputRef = useRef<HTMLInputElement>(null);
  const idCameraInputRef = useRef<HTMLInputElement>(null);

  // Lightbox state — for viewing any ID image full screen
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Real-time clock: tick check-in time every minute while the form is open
  const checkInTimeManualRef = useRef(false);
  useEffect(() => {
    if (!isFormOpen) return;
    // Reset manual flags when form opens so it starts live
    checkInTimeManualRef.current = false;
    checkOutTimeManualRef.current = false;
    // Snap to current time immediately on open
    const now = getCurrentTimeStr();
    setCheckInTime(now);
    setCheckOutTime(now);

    const timer = setInterval(() => {
      if (!checkInTimeManualRef.current) {
        const t = getCurrentTimeStr();
        setCheckInTime(t);
        if (!checkOutTimeManualRef.current) {
          setCheckOutTime(t);
        }
      }
    }, 10000); // update every 10 seconds

    return () => clearInterval(timer);
  }, [isFormOpen]);

  // Sync check-out time to check-in time whenever check-in changes (unless manually overridden)
  useEffect(() => {
    if (!checkOutTimeManualRef.current) {
      setCheckOutTime(checkInTime);
    }
  }, [checkInTime]);

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

    // Date filter — if a date is selected match full YYYY-MM-DD, otherwise show all
    const matchesDate = !selectedDate || b.createdAt?.slice(0, 10) === selectedDate;

    return matchesSearch && matchesStatus && matchesRoomType && matchesDate;
  });

  // Derived pagination values
  const totalPages = Math.max(1, Math.ceil(filteredList.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const pagedList  = filteredList.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  // Reset to page 1 whenever any filter changes
  React.useEffect(() => { setCurrentPage(1); }, [searchQuery, selectedStatus, selectedRoomType, selectedDate]);

  // Prices from Admin settings — live from Supabase
  const ROOM_PRICES: Record<string, number> = {
    'Bed space':   settings.price_bed_space,
    'Solo room':   settings.price_solo_room,
    'Couple room': settings.price_couple_room,
    'Family room': settings.price_family_room,
  };

  const KEY_DEPOSIT = settings.key_deposit;

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

  // Handle ID image file selection
  const handleIdImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setIdImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  // Submit Quick Booking handler — accepts status so we can create as Pending OR Checked-in
  const handleFormSubmit = (e: React.FormEvent | React.MouseEvent, submitStatus: 'Pending' | 'Checked-in' = 'Pending') => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      alert('Please fill out First Name and Last Name.');
      return;
    }
    if (contactNumber && contactNumber.length !== 11) {
      alert('Contact number must be exactly 11 digits.');
      return;
    }

    if (paymentMode === 'GCash' && !referenceNumber.trim()) {
      alert('Please enter the GCash Reference Number.');
      return;
    }

    const fullName = [firstName.trim(), middleName.trim(), lastName.trim()].filter(Boolean).join(' ');

    // Use override price if provided, otherwise use auto-computed price
    const nights = computeNights(checkIn, checkOut);
    const basePrice = parseFloat(customPrice) || computePrice(formRoomType, nights);
    const discount = hasDiscount ? (parseFloat(discountAmount) || 0) : 0;
    const computedPrice = Math.max(0, basePrice - discount) + KEY_DEPOSIT;

    const newBooking: BookingRecord = {
      id: `bk-${Date.now().toString().slice(-4)}`,
      guestName: fullName,
      email: guestEmail,
      contactNumber: contactNumber || '',
      roomType: formRoomType,
      roomNumber: guestRoomNumber || `${100 + Math.floor(Math.random() * 100)}`,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      checkInTime: submitStatus === 'Pending' ? null : checkInTime,
      checkOutTime: submitStatus === 'Pending' ? null : checkOutTime,
      status: submitStatus,
      price: computedPrice,
      keyDeposit: KEY_DEPOSIT,
      discountAmount: hasDiscount ? (parseFloat(discountAmount) || 0) : 0,
      paymentMode,
      referenceNumber: paymentMode === 'GCash' ? referenceNumber.trim() : '',
      createdAt: new Date().toISOString(),
      checkedInAt: submitStatus === 'Checked-in' ? new Date().toISOString() : null,
    };

    onAddBooking(newBooking, idImageFile);

    // Reset Form
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setGuestEmail('');
    setContactNumber('');
    setFormRoomType('Bed space');
    setGuestRoomNumber('101');
    setCustomPrice('');
    setHasDiscount(false);
    setDiscountAmount('');
    checkInTimeManualRef.current = false;
    checkOutTimeManualRef.current = false;
    setCheckInTime(getCurrentTimeStr());
    setCheckOutTime(getCurrentTimeStr());
    setPaymentMode('Cash');
    setReferenceNumber('');
    setIdImageFile(null);
    setIdImagePreview(null);
    if (idFileInputRef.current) idFileInputRef.current.value = '';
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
      'Checked-in': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700',
      'Checked-out': 'bg-blue-50 text-blue-700 dark:bg-slate-800/80 dark:text-slate-300 border border-blue-300 dark:border-slate-600',
      'Pending': 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-300 dark:border-amber-700',
      'Cancelled': 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-300 dark:border-rose-700',
    };
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${styles[status]}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 pt-16 lg:pt-0">
      {/* HEADER SECTION */}
      <div className="flex items-start sm:items-center justify-between gap-3 border-b-2 border-slate-300 dark:border-[#2d3748] pb-5">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900 dark:text-white font-display">
            Bookings
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 mt-1 font-semibold">
            Manage transient bookings, check-in status, and client logs
          </p>
        </div>

        {/* Create Booking Button */}
        <button
          id="btn-open-booking-form"
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white px-4 sm:px-5 py-2.5 rounded-xl text-xs font-bold transition-colors shadow-md shadow-cyan-500/30 cursor-pointer shrink-0 min-h-[40px]"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="hidden min-[400px]:inline">New Booking</span>
          <span className="min-[400px]:hidden">New</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-[#151c27] p-3 sm:p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-md">
        {/* Search */}
        <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500 dark:text-gray-400" />
          <input
            id="input-booking-search"
            type="text"
            placeholder="Search guest name, email, or room number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-100 dark:bg-[#0a0f17] border-2 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:bg-white dark:focus:bg-[#111721] rounded-xl text-gray-800 dark:text-gray-200 transition-all font-semibold placeholder:text-gray-400 dark:placeholder:text-gray-600"
          />
        </div>

        {/* Date Filter — single picker: month → day in one control */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
            <input
              id="select-filter-date"
              type="date"
              value={selectedDate}
              max={todayStr()}
              onChange={(e) => {
                const picked = e.target.value;
                if (picked && picked > todayStr()) {
                  setDateWarnMsg("Future dates can't be selected.");
                  setSelectedDate('');
                } else {
                  setDateWarnMsg('');
                  setSelectedDate(picked);
                }
              }}
              className="w-full text-xs font-bold bg-slate-100 dark:bg-[#0a0f17] text-gray-700 dark:text-gray-200 border-none outline-none focus:ring-2 focus:ring-cyan-500 py-2.5 px-3 rounded-xl cursor-pointer"
            />
            {selectedDate && (
              <button
                onClick={() => { setSelectedDate(''); setDateWarnMsg(''); }}
                className="shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {dateWarnMsg && (
            <p className="text-[10px] font-semibold text-rose-500 dark:text-rose-400 pl-6">
              ⚠ {dateWarnMsg}
            </p>
          )}
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            id="select-filter-status"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as any)}
            className="w-full text-xs font-bold bg-slate-100 dark:bg-[#0a0f17] text-gray-700 dark:text-gray-200 border-none outline-none focus:ring-2 focus:ring-cyan-500 py-2.5 px-3 rounded-xl cursor-pointer"
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
          <Bed className="w-4 h-4 text-gray-500 dark:text-gray-400 shrink-0" />
          <select
            id="select-filter-roomtype"
            value={selectedRoomType}
            onChange={(e) => setSelectedRoomType(e.target.value as any)}
            className="w-full text-xs font-bold bg-slate-100 dark:bg-[#0a0f17] text-gray-700 dark:text-gray-200 border-none outline-none focus:ring-2 focus:ring-cyan-500 py-2.5 px-3 rounded-xl cursor-pointer"
          >
            <option value="All">All Room Types</option>
            <option value="Bed space">Bed space</option>
            <option value="Solo room">Solo room</option>
            <option value="Couple room">Couple room</option>
            <option value="Family room">Family room</option>
          </select>
        </div>
      </div>

      {/* BOOKINGS TABLE — desktop/tablet */}
      <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-lg overflow-hidden">

        {/* ── DESKTOP TABLE (md and up) ── */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-[#0a0f17] text-gray-600 dark:text-gray-300 text-[10px] font-black uppercase tracking-widest border-b-2 border-slate-300 dark:border-slate-600">
                <th className="py-4 px-6">Borders Name</th>
                <th className="py-4 px-4">Room Alloc</th>
                <th className="py-4 px-4">Check In/Out</th>
                <th className="py-4 px-4">Cost / Night</th>
                <th className="py-4 px-4">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 text-sm">
              <AnimatePresence initial={false}>
                {pagedList.map((bk) => (
                  <motion.tr
                    key={bk.id}
                    id={`booking-row-${bk.id}`}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors group"
                  >
                    {/* Border Name & ID */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          (() => {
                            if (bk.status !== 'Checked-in') return false;
                            const checkOutDay = bk.checkOutDate;
                            const checkInTime = bk.checkedInAt ? new Date(bk.checkedInAt) : null;
                            const hours = checkInTime ? checkInTime.getHours() : 12;
                            const minutes = checkInTime ? checkInTime.getMinutes() : 0;
                            const dueAt = new Date(`${checkOutDay}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
                            return new Date() >= dueAt;
                          })()
                            ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-200 dark:ring-rose-800'
                            : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-200 dark:ring-cyan-800'
                        }`}>
                          {bk.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${
                            (() => {
                              if (bk.status !== 'Checked-in') return false;
                              const checkOutDay = bk.checkOutDate;
                              const checkInTime = bk.checkedInAt ? new Date(bk.checkedInAt) : null;
                              const hours = checkInTime ? checkInTime.getHours() : 12;
                              const minutes = checkInTime ? checkInTime.getMinutes() : 0;
                              const dueAt = new Date(`${checkOutDay}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
                              return new Date() >= dueAt;
                            })()
                              ? 'text-rose-500 dark:text-rose-400'
                              : 'text-gray-900 dark:text-white'
                          }`}>{bk.guestName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <p className="font-bold text-gray-800 dark:text-gray-100 text-sm">Room {bk.roomNumber}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">{bk.roomType}</p>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-xs">
                        <p className="font-bold text-gray-700 dark:text-gray-200">In: <span className="font-mono">{bk.checkInDate}</span></p>
                        <p className="text-gray-500 dark:text-gray-400 font-medium">Out: <span className="font-mono">{bk.checkOutDate}</span></p>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="font-mono font-black text-gray-900 dark:text-white text-sm tracking-tight">
                        ₱{bk.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="py-4 px-4">{getStatusBadge(bk.status)}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedBooking(bk)}
                          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:hover:text-white text-xs font-bold transition-all duration-150 flex items-center gap-1 shadow-sm"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
                        {(bk.status === 'Checked-out' || bk.status === 'Cancelled') && (
                          <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold italic">Archived</span>
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
                        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
                          No bookings found{selectedDate ? ` for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}` : selectedStatus !== 'All' || selectedRoomType !== 'All' || searchQuery ? ' matching your filters' : ''}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">Try selecting a different date or adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* ── MOBILE CARD LIST (below md) ── */}
        <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-700">
          <AnimatePresence initial={false}>
            {pagedList.map((bk) => {
              const isOverdue = (() => {
                if (bk.status !== 'Checked-in') return false;
                const checkInTime = bk.checkedInAt ? new Date(bk.checkedInAt) : null;
                const hours = checkInTime ? checkInTime.getHours() : 12;
                const minutes = checkInTime ? checkInTime.getMinutes() : 0;
                const dueAt = new Date(`${bk.checkOutDate}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
                return new Date() >= dueAt;
              })();
              return (
                <motion.div
                  key={bk.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors"
                >
                  {/* Top row: avatar + name + status badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isOverdue
                          ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 ring-2 ring-rose-200 dark:ring-rose-800'
                          : 'bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-200 dark:ring-cyan-800'
                      }`}>
                        {bk.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                      </div>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${isOverdue ? 'text-rose-500 dark:text-rose-400' : 'text-gray-900 dark:text-white'}`}>
                          {bk.guestName}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          Room {bk.roomNumber} · {bk.roomType}
                        </p>
                      </div>
                    </div>
                    {getStatusBadge(bk.status)}
                  </div>

                  {/* Middle row: dates + price */}
                  <div className="flex items-center justify-between text-xs mb-3">
                    <div>
                      <span className="font-bold text-gray-700 dark:text-gray-200">In: </span>
                      <span className="font-mono text-gray-600 dark:text-gray-300">{bk.checkInDate}</span>
                      <span className="mx-1.5 text-gray-300 dark:text-gray-600">→</span>
                      <span className="font-bold text-gray-700 dark:text-gray-200">Out: </span>
                      <span className="font-mono text-gray-600 dark:text-gray-300">{bk.checkOutDate}</span>
                    </div>
                    <span className="font-mono font-black text-gray-900 dark:text-white shrink-0 ml-2">
                      ₱{bk.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Bottom row: action */}
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setSelectedBooking(bk)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-h-[40px]"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </button>
                    {(bk.status === 'Checked-out' || bk.status === 'Cancelled') && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-semibold italic shrink-0">Archived</span>
                    )}
                  </div>
                </motion.div>
              );
            })}
            {filteredList.length === 0 && (
              <div className="py-14 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Calendar className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                  <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">No bookings found</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Try adjusting your filters.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* PAGER FOOTER */}
        {filteredList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 sm:px-5 py-3 border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0f141c]">
            <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0">
              Showing{' '}
              <span className="text-gray-800 dark:text-gray-200 font-bold">
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredList.length)}
              </span>
              {' '}of{' '}
              <span className="text-gray-800 dark:text-gray-200 font-bold">{filteredList.length}</span>
              {' '}records
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1 flex-wrap justify-center">
                <button onClick={() => setCurrentPage(1)} disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[36px] min-w-[36px]"
                  title="First page">«</button>
                <button onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[36px] min-w-[36px]"
                  title="Previous page">‹</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-400 dark:text-gray-600 font-bold select-none">…</span>
                    ) : (
                      <button key={item} onClick={() => setCurrentPage(item as number)}
                        className={`w-9 h-9 text-xs font-bold rounded-lg border-2 transition-all ${
                          safePage === item
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-md shadow-cyan-500/40 scale-105'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}>
                        {item}
                      </button>
                    )
                  )}
                <button onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[36px] min-w-[36px]"
                  title="Next page">›</button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all min-h-[36px] min-w-[36px]"
                  title="Last page">»</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUICK WORKSPACE SLIDE-OVER FORM */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: '0%' }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="fixed top-0 right-0 h-screen w-full sm:max-w-md bg-white dark:bg-[#0f1520] shadow-2xl flex flex-col overflow-hidden z-10"
            >
                {/* Form header */}
                <div className="p-4 sm:p-6 border-b-2 border-slate-200 dark:border-slate-700 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    <h2 className="text-lg font-black text-gray-900 dark:text-white font-display">
                      Create Border Booking
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
                  className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5"
                >
                  {/* Name fields */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" />
                      Border Name
                    </label>
                    {/* First + Last on same row */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        id="form-first-name"
                        type="text"
                        required
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                      />
                      <input
                        id="form-last-name"
                        type="text"
                        required
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                      />
                    </div>
                    {/* Middle name full width */}
                    <input
                      id="form-middle-name"
                      type="text"
                      placeholder="Middle Name/Initial"
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Border email — optional */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Border Email Address
                    </label>
                    <input
                      id="form-guest-email"
                      type="email"
                      placeholder="Email Address"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Contact Number
                    </label>
                    <input
                      id="form-contact-number"
                      type="tel"
                      placeholder="09XXXXXXXXX"
                      value={contactNumber}
                      maxLength={11}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setContactNumber(val.slice(0, 11));
                      }}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold font-mono tracking-wider"
                    />
                    {contactNumber.length > 0 && contactNumber.length < 11 && (
                      <p className="text-[10px] text-amber-500 font-medium">
                        {11 - contactNumber.length} more digit{11 - contactNumber.length !== 1 ? 's' : ''} needed
                      </p>
                    )}
                  </div>

                  {/* Room Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl font-bold cursor-pointer"
                    >
                      <option value="Bed space">Bed space (Shared dormitory)</option>
                      <option value="Solo room">Solo room (Private cabin)</option>
                      <option value="Couple room">Couple room (Executive suite)</option>
                      <option value="Family room">Family room (2-3 pax)</option>
                    </select>
                  </div>

                  {/* Room Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Hash className="w-3.5 h-3.5" />
                      Assigned Room / Bed Number
                    </label>
                    <input
                      id="form-room-number"
                      type="text"
                      placeholder="e.g. 104-B"
                      value={guestRoomNumber}
                      onChange={(e) => setGuestRoomNumber(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Checkin Checkout range */}
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Check-In
                        {!checkInTimeManualRef.current && (
                          <span className="ml-auto text-[9px] font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-0.5">
                          </span>
                        )}
                      </label>
                      <input
                        id="form-check-in"
                        type="date"
                        min={todayStr()}
                        value={checkIn}
                        onChange={(e) => {
                          const newCheckIn = e.target.value;
                          setCheckIn(newCheckIn);
                          const minOut = new Date(newCheckIn);
                          minOut.setDate(minOut.getDate() + 1);
                          const minOutStr = minOut.toISOString().split('T')[0];
                          if (checkOut <= newCheckIn) setCheckOut(minOutStr);
                        }}
                        className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
                      />
                      {/* Time picker */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={checkInTime}
                          onChange={(e) => {
                            checkInTimeManualRef.current = true;
                            setCheckInTime(e.target.value);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-mono"
                        />
                        <div className="flex rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 shrink-0">
                          {(['AM','PM'] as const).map((period) => {
                            const currentPeriod = parseInt(checkInTime.split(':')[0]) >= 12 ? 'PM' : 'AM';
                            const isActive = currentPeriod === period;
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => {
                                  checkInTimeManualRef.current = true;
                                  const [h, m] = checkInTime.split(':').map(Number);
                                  let newH = h;
                                  if (period === 'AM' && h >= 12) newH = h - 12;
                                  if (period === 'PM' && h < 12) newH = h + 12;
                                  setCheckInTime(`${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
                                }}
                                className={`px-2 py-2 text-[10px] font-bold transition-colors ${isActive ? 'bg-cyan-500 text-white' : 'bg-gray-50 dark:bg-[#0f141c] text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                              >
                                {period}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />
                        Check-Out
                        {!checkOutTimeManualRef.current && (
                          <span className="ml-auto text-[9px] font-bold text-cyan-500 dark:text-cyan-400 uppercase tracking-widest">
                          </span>
                        )}
                      </label>
                      <input
                        id="form-check-out"
                        type="date"
                        min={(() => { const d = new Date(checkIn); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; })()}
                        value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 text-gray-800 dark:text-gray-200 rounded-xl outline-none focus:border-cyan-500 dark:focus:border-cyan-400"
                      />
                      {/* Time picker */}
                      <div className="flex items-center gap-1.5">
                        <input
                          type="time"
                          value={checkOutTime}
                          onChange={(e) => {
                            checkOutTimeManualRef.current = true;
                            setCheckOutTime(e.target.value);
                          }}
                          className="flex-1 px-3 py-2 text-xs bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-mono"
                        />
                        <div className="flex rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 shrink-0">
                          {(['AM','PM'] as const).map((period) => {
                            const currentPeriod = parseInt(checkOutTime.split(':')[0]) >= 12 ? 'PM' : 'AM';
                            const isActive = currentPeriod === period;
                            return (
                              <button
                                key={period}
                                type="button"
                                onClick={() => {
                                  checkOutTimeManualRef.current = true;
                                  const [h, m] = checkOutTime.split(':').map(Number);
                                  let newH = h;
                                  if (period === 'AM' && h >= 12) newH = h - 12;
                                  if (period === 'PM' && h < 12) newH = h + 12;
                                  setCheckOutTime(`${String(newH).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
                                }}
                                className={`px-2 py-2 text-[10px] font-bold transition-colors ${isActive ? 'bg-cyan-500 text-white' : 'bg-gray-50 dark:bg-[#0f141c] text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-800'}`}
                              >
                                {period}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mode of Payment */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Mode of Payment
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'GCash'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => { setPaymentMode(mode); setReferenceNumber(''); }}
                          className={`py-2.5 rounded-xl text-sm font-bold border transition-all duration-150 ${
                            paymentMode === mode
                              ? mode === 'GCash'
                                ? 'bg-blue-500 border-blue-500 text-white shadow-sm'
                                : 'bg-cyan-500 border-cyan-500 text-white shadow-sm'
                              : 'bg-gray-50 dark:bg-[#0f141c] border-slate-300 dark:border-slate-600 text-gray-500 dark:text-gray-400 hover:border-cyan-400'
                          }`}
                        >
                          {mode === 'GCash' ? '📱 GCash' : '💵 Cash'}
                        </button>
                      ))}
                    </div>
                    {/* GCash Reference Number */}
                    {paymentMode === 'GCash' && (
                      <div className="space-y-1.5 pt-1">
                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display">
                          GCash Reference Number <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Enter GCash reference number"
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-blue-400 dark:border-blue-700 focus:outline-none focus:border-blue-500 dark:focus:border-blue-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold font-mono tracking-wider"
                        />
                      </div>
                    )}
                  </div>

                  {/* Auto-computed price preview */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      Booking Price (PHP ₱)
                    </label>

                    {/* Price breakdown */}
                    <div className="w-full px-4 py-3 bg-cyan-50 dark:bg-cyan-950/20 border-2 border-cyan-300 dark:border-cyan-800 rounded-xl space-y-1.5">
                      {/* Base price row */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                          {computeNights(checkIn, checkOut)} Night{computeNights(checkIn, checkOut) !== 1 ? 's' : ''} × ₱{ROOM_PRICES[formRoomType].toLocaleString()}
                        </span>
                        <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-300">
                          ₱{(customPrice ? parseFloat(customPrice) : autoComputedPrice).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Key deposit row — always shown */}
                      <div className="flex items-center justify-between border-t border-cyan-200 dark:border-cyan-900/50 pt-1.5">
                        <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold flex items-center gap-1">
                           Key Deposit
                          <span className="text-[12px] font-normal text-cyan-500 dark:text-cyan-500">(refundable)</span>
                        </span>
                        <span className="text-sm font-bold font-mono text-cyan-700 dark:text-cyan-300">
                          ₱{KEY_DEPOSIT.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Discount row — only shown when checked */}
                      {hasDiscount && parseFloat(discountAmount) > 0 && (
                        <div className="flex items-center justify-between border-t border-cyan-200 dark:border-cyan-900/50 pt-1.5">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Discount</span>
                          <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-400">
                            − ₱{parseFloat(discountAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Total — always shown since key deposit is always added */}
                      <div className="flex items-center justify-between border-t-2 border-cyan-300 dark:border-cyan-700 pt-1.5">
                        <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Total</span>
                        <span className="text-lg font-black font-mono text-cyan-700 dark:text-cyan-300">
                          ₱{(Math.max(0, (customPrice ? parseFloat(customPrice) : autoComputedPrice) - (hasDiscount ? (parseFloat(discountAmount) || 0) : 0)) + KEY_DEPOSIT).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Discount checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                      <input
                        type="checkbox"
                        checked={hasDiscount}
                        onChange={(e) => {
                          setHasDiscount(e.target.checked);
                          if (!e.target.checked) setDiscountAmount('');
                        }}
                        className="w-4 h-4 rounded border-2 border-slate-300 dark:border-slate-600 accent-amber-500 cursor-pointer"
                      />
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Apply Discount</span>
                    </label>

                    {/* Discount amount input */}
                    {hasDiscount && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">₱</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter discount amount"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value.replace(/[^0-9]/g, ''))}
                          onWheel={(e) => (e.target as HTMLInputElement).blur()}
                          className="w-full px-4 py-2.5 text-sm bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-amber-700 dark:text-amber-300 font-semibold font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* ID Image Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Valid ID 
                    </label>

                    {/* Upload area */}
                    {!idImagePreview ? (
                      <div className="flex gap-2">
                        {/* Upload from album */}
                        <button
                          type="button"
                          onClick={() => idFileInputRef.current?.click()}
                          className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl py-5 flex flex-col items-center gap-2 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 dark:hover:border-cyan-600 transition-colors cursor-pointer bg-slate-50 dark:bg-[#0f141c]"
                        >
                          <Upload className="w-5 h-5" />
                          <span className="text-[11px] font-semibold text-center leading-tight">Upload from<br/>Album</span>
                        </button>
                        {/* Take photo via camera */}
                        <button
                          type="button"
                          onClick={() => idCameraInputRef.current?.click()}
                          className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl py-5 flex flex-col items-center gap-2 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 dark:hover:border-cyan-600 transition-colors cursor-pointer bg-slate-50 dark:bg-[#0f141c]"
                        >
                          <Camera className="w-5 h-5" />
                          <span className="text-[11px] font-semibold text-center leading-tight">Take<br/>Photo</span>
                        </button>
                      </div>
                    ) : (
                      <div className="relative group rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                        <img
                          src={idImagePreview}
                          alt="ID Preview"
                          className="w-full h-40 object-cover"
                        />
                        {/* Overlay — always visible on touch, hover on desktop */}
                        <div className="absolute inset-0 bg-black/50 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={() => setLightboxUrl(idImagePreview)}
                            className="p-2 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-colors"
                            title="View full size"
                          >
                            <ZoomIn className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setIdImageFile(null); setIdImagePreview(null); if (idFileInputRef.current) idFileInputRef.current.value = ''; if (idCameraInputRef.current) idCameraInputRef.current.value = ''; }}
                            className="p-2 bg-rose-500/80 hover:bg-rose-500 rounded-xl text-white transition-colors"
                            title="Remove image"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <span className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-full font-semibold">
                          {idImageFile?.name}
                        </span>
                      </div>
                    )}

                    {/* Hidden file input — album/gallery */}
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={handleIdImageChange}
                    />
                    {/* Hidden file input — camera capture */}
                    <input
                      ref={idCameraInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      className="hidden"
                      onChange={handleIdImageChange}
                    />
                  </div>

                  {/* Amenities */}
                  <div className="p-4 bg-slate-100/50 dark:bg-slate-900/30 rounded-xl border border-slate-300 dark:border-slate-600 space-y-2">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <ChevronRight className="w-3.5 h-3.5 text-cyan-500" />
                      Amenities
                    </p>
                    <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
                      {(
                        formRoomType === 'Couple room'
                          ? ['Wifi', 'Aircon', 'Free Drinking water', 'Free Parking', 'Smoking Area', 'Canteen Inside']
                          : formRoomType === 'Family room'
                          ? ['Wifi', 'Aircon', 'Own CR', 'Free Drinking water', 'Free Parking', 'Smoking Area', 'Canteen Inside']
                          : ['Wifi', 'Free Drinking water', 'Free Parking', 'Smoking Area', 'Canteen Inside']
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
                <div className="p-4 sm:p-6 border-t border-[#c8cdd6] dark:border-slate-700 bg-gray-55/40 dark:bg-[#0e141d] flex flex-col gap-2 shrink-0">
                  {/* Top row — two action buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleFormSubmit(e, 'Pending')}
                      className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Pending Booking</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleFormSubmit(e, 'Checked-in')}
                      className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-500 rounded-xl text-xs font-bold text-white transition-colors flex items-center justify-center gap-1.5"
                    >
                      <span>Check-in Now</span>
                    </button>
                  </div>
                  {/* Bottom row — cancel */}
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="w-full py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOOKING DETAILS MODAL */}
      <AnimatePresence>
        {selectedBooking && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
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
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: 'spring', damping: 25, stiffness: 280 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-[#121822] sm:rounded-2xl rounded-t-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden max-h-[92vh] sm:max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b-2 border-slate-300 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-gray-50 font-display uppercase tracking-wider">
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
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1">
                {/* Booking ID + Status */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-lg">
                    #{selectedBooking.id}
                  </span>
                  {getStatusBadge(selectedBooking.status)}
                </div>

                {/* Border info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <User className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Border Name</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.guestName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Email</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Contact Number</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-gray-50 font-mono">{(selectedBooking as any).contactNumber || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Bed className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Room Type</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.roomType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Room No.</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.roomNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dates row */}
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Check-In Date</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.checkInDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Check-Out Date</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-gray-50">{selectedBooking.checkOutDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Times row */}
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Check-In Time</p>
                        <p className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                          {selectedBooking.status === 'Pending'
                            ? <span className="text-gray-400 dark:text-gray-600 font-normal italic text-xs">Awaiting check-in</span>
                            : selectedBooking.checkedInAt
                              ? (() => {
                                  const d = new Date(selectedBooking.checkedInAt);
                                  const h = d.getHours(), m = d.getMinutes();
                                  const period = h >= 12 ? 'PM' : 'AM';
                                  const displayH = h % 12 || 12;
                                  return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                })()
                              : selectedBooking.checkInTime
                                ? (() => {
                                    const [h, m] = selectedBooking.checkInTime!.split(':').map(Number);
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayH = h % 12 || 12;
                                    return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                  })()
                                : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-900/50">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Check-Out Time</p>
                        <p className="text-sm font-bold font-mono text-rose-500 dark:text-rose-400">
                          {selectedBooking.status === 'Pending'
                            ? <span className="text-gray-400 dark:text-gray-600 font-normal italic text-xs">Awaiting check-in</span>
                            : selectedBooking.checkedOutAt
                              ? (() => {
                                  const d = new Date(selectedBooking.checkedOutAt);
                                  const h = d.getHours(), m = d.getMinutes();
                                  const period = h >= 12 ? 'PM' : 'AM';
                                  const displayH = h % 12 || 12;
                                  return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                })()
                              : selectedBooking.checkOutTime && selectedBooking.checkOutTime !== '12:00'
                                ? (() => {
                                    const [h, m] = selectedBooking.checkOutTime!.split(':').map(Number);
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayH = h % 12 || 12;
                                    return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                  })()
                              : selectedBooking.checkedInAt
                                ? (() => {
                                    // Fallback: mirror the check-in timestamp
                                    const d = new Date(selectedBooking.checkedInAt);
                                    const h = d.getHours(), m = d.getMinutes();
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayH = h % 12 || 12;
                                    return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                  })()
                              : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* ── Live Overstay Alert — shown when guest is still Checked-in past their check-out date ── */}
                  {(() => {
                    if (selectedBooking.status !== 'Checked-in') return null;
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(selectedBooking.checkOutDate);
                    due.setHours(0, 0, 0, 0);
                    const overstayDays = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
                    if (overstayDays <= 0) return null;
                    const nightlyRate = ROOM_PRICES[selectedBooking.roomType] ?? 0;
                    const livePenalty = overstayDays * nightlyRate;
                    return (
                      <div className="p-3 bg-orange-50 dark:bg-orange-950/30 rounded-xl border-2 border-orange-400 dark:border-orange-600 space-y-2.5">
                        {/* Alert header */}
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0 shadow-sm shadow-orange-500/40">
                            <AlertTriangle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <p className="text-xs font-black text-orange-700 dark:text-orange-400 uppercase tracking-wider">
                              Active Overstay Detected
                            </p>
                            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">
                              Guest was due to check out on {selectedBooking.checkOutDate}
                            </p>
                          </div>
                          <span className="ml-auto shrink-0 px-2.5 py-1 bg-orange-500 text-white text-xs font-black rounded-lg shadow shadow-orange-500/30">
                            +{overstayDays} day{overstayDays !== 1 ? 's' : ''}
                          </span>
                        </div>
                        {/* Breakdown row */}
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-orange-200 dark:border-orange-700/50">
                          <div className="text-center p-2 bg-white dark:bg-orange-950/40 rounded-lg border border-orange-200 dark:border-orange-700/50">
                            <p className="text-[9px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-0.5">Overstay Days</p>
                            <p className="text-lg font-black text-orange-600 dark:text-orange-300 leading-none">{overstayDays}</p>
                            <p className="text-[9px] text-orange-400 dark:text-orange-500 font-medium mt-0.5">day{overstayDays !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="text-center p-2 bg-white dark:bg-orange-950/40 rounded-lg border border-orange-200 dark:border-orange-700/50">
                            <p className="text-[9px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-wider mb-0.5">Nightly Rate</p>
                            <p className="text-sm font-black text-orange-600 dark:text-orange-300 leading-none font-mono">₱{nightlyRate.toLocaleString()}</p>
                            <p className="text-[9px] text-orange-400 dark:text-orange-500 font-medium mt-0.5">per night</p>
                          </div>
                          <div className="text-center p-2 bg-orange-500 dark:bg-orange-600 rounded-lg shadow-sm shadow-orange-500/30">
                            <p className="text-[9px] font-bold text-white/80 uppercase tracking-wider mb-0.5">Penalty Due</p>
                            <p className="text-sm font-black text-white leading-none font-mono">₱{livePenalty.toLocaleString()}</p>
                            <p className="text-[9px] text-white/70 font-medium mt-0.5">accruing</p>
                          </div>
                        </div>
                        <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium text-center">
                          Use <span className="font-black">Overstay Check-Out</span> in the footer to collect the penalty and close this booking.
                        </p>
                      </div>
                    );
                  })()}

                  <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-300 dark:border-cyan-700 space-y-2">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-cyan-500 shrink-0" />
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">Price Breakdown</p>
                      </div>
                      {selectedBooking.paymentMode && (
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                          selectedBooking.paymentMode === 'GCash'
                            ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {selectedBooking.paymentMode === 'GCash' ? '📱 GCash' : '💵 Cash'}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1.5 pt-1 border-t border-cyan-200 dark:border-cyan-900/50">
                      {/* Base room price row */}
                      {(() => {
                        const discount  = selectedBooking.discountAmount ?? 0;
                        const basePrice = selectedBooking.price - KEY_DEPOSIT + discount;
                        const nights = Math.max(1, Math.round(
                          (new Date(selectedBooking.checkOutDate).getTime() - new Date(selectedBooking.checkInDate).getTime())
                          / (1000 * 60 * 60 * 24)
                        ));
                        const pricePerNight = ROOM_PRICES[selectedBooking.roomType] ?? 0;
                        return (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold">
                              Room Price
                              <span className="ml-1.5 text-[10px] text-gray-400 font-normal">
                                ({nights} night{nights !== 1 ? 's' : ''} × ₱{pricePerNight.toLocaleString()})
                              </span>
                            </span>
                            <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100">
                              ₱{basePrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Key deposit — always shown */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-600 dark:text-gray-300 font-semibold flex items-center gap-1">
                           Key Deposit
                          <span className="text-[px] text-gray-400 dark:text-gray-500 font-normal">(refundable)</span>
                        </span>
                        <span className="text-sm font-bold font-mono text-gray-800 dark:text-gray-100">
                          ₱{KEY_DEPOSIT.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      {/* Discount row — only when discount was applied */}
                      {(selectedBooking.discountAmount ?? 0) > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800/50">
                          <span className="text-xs text-amber-700 dark:text-amber-400 font-bold flex items-center gap-1.5">
                             Discount Applied
                          </span>
                          <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-400">
                            − ₱{(selectedBooking.discountAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Early checkout refund row — only when refund was issued */}
                      {(selectedBooking.refundAmount ?? 0) > 0 && (
                        <div className="flex items-center justify-between px-2 py-1.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-200 dark:border-rose-800/50">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <RotateCcw className="w-3 h-3 text-rose-700 dark:text-rose-400 shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs text-rose-700 dark:text-rose-400 font-bold leading-tight">
                                Early Check-Out Refund
                              </p>
                              {selectedBooking.actualCheckOutDate && (
                                <p className="text-[10px] font-normal text-rose-500 dark:text-rose-400 leading-tight">
                                  checked out {selectedBooking.actualCheckOutDate}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 shrink-0 ml-2">
                            − ₱{(selectedBooking.refundAmount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      {/* Overstay penalty row — only when penalty was recorded on check-out */}
                      {(selectedBooking.overstayPenalty ?? 0) > 0 && (
                        <div className="px-2 py-2 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-300 dark:border-orange-700 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <AlertTriangle className="w-3 h-3 text-orange-600 dark:text-orange-400 shrink-0" />
                              <p className="text-xs text-orange-700 dark:text-orange-400 font-bold leading-tight">
                                Overstay Penalty Charged
                              </p>
                            </div>
                            <span className="text-sm font-black font-mono text-orange-600 dark:text-orange-400 shrink-0 ml-2">
                              + ₱{(selectedBooking.overstayPenalty ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-orange-200 dark:border-orange-700/50">
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-orange-950/40 rounded border border-orange-200 dark:border-orange-700/50">
                              <span className="text-[9px] font-bold text-orange-500 dark:text-orange-400 uppercase">Days Overstayed:</span>
                              <span className="text-xs font-black text-orange-700 dark:text-orange-300 ml-auto">
                                {selectedBooking.overstayDays ?? '—'} day{(selectedBooking.overstayDays ?? 0) !== 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2 py-1 bg-white dark:bg-orange-950/40 rounded border border-orange-200 dark:border-orange-700/50">
                              <span className="text-[9px] font-bold text-orange-500 dark:text-orange-400 uppercase">Rate:</span>
                              <span className="text-xs font-black text-orange-700 dark:text-orange-300 ml-auto font-mono">
                                ₱{(ROOM_PRICES[selectedBooking.roomType] ?? 0).toLocaleString()}/night
                              </span>
                            </div>
                          </div>
                          {selectedBooking.actualCheckOutDate && (
                            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">
                              Checked out: {selectedBooking.actualCheckOutDate}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Total Revenue — excludes key deposit (refundable) and deducts early checkout refund */}
                    {(() => {
                      const keyDep       = selectedBooking.keyDeposit ?? 0;
                      const refund       = selectedBooking.refundAmount ?? 0;
                      const penalty      = selectedBooking.overstayPenalty ?? 0;
                      const totalRevenue = selectedBooking.price - keyDep - refund;
                      return (
                        <div className="flex items-center justify-between border-t-2 border-cyan-300 dark:border-cyan-700 pt-2">
                          <div>
                            <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">
                              Total Revenue:
                            </span>
                            {penalty > 0 && (
                              <p className="text-[10px] text-orange-500 dark:text-orange-400 font-semibold mt-0.5">
                                incl. ₱{penalty.toLocaleString()} overstay penalty
                              </p>
                            )}
                          </div>
                          <span className="text-xl font-black font-mono text-cyan-600 dark:text-cyan-400 tracking-tight">
                            ₱{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* GCash Reference Number */}
                  {selectedBooking.paymentMode === 'GCash' && selectedBooking.referenceNumber && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-300 dark:border-blue-700">
                      <Hash className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold">GCash Reference No.</p>
                        <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{selectedBooking.referenceNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ID Image */}
                {selectedBooking.idImageUrl && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase tracking-wider font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />
                      Valid ID
                    </p>
                    <div
                      className="relative group rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600 cursor-pointer"
                      onClick={() => setLightboxUrl(selectedBooking.idImageUrl!)}
                    >
                      <img
                        src={selectedBooking.idImageUrl}
                        alt="Guest ID"
                        className="w-full h-36 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <ZoomIn className="w-6 h-6 text-white" />
                        <span className="text-white text-xs font-bold">Click to view</span>
                      </div>
                    </div>
                  </div>
                )}


              </div>

              {/* Footer */}
              <div className="p-4 border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0e141d] space-y-2">

                {/* Extend Stay inline form — only for Checked-in */}
                {selectedBooking.status === 'Checked-in' && showExtend && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 space-y-3 mb-1">
                    <p className="text-xs font-black text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Extend Stay
                    </p>

                    {/* New check-out date */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        New Check-Out Date
                      </label>
                      <input
                        type="date"
                        min={selectedBooking.checkOutDate}
                        value={extendCheckOut}
                        onChange={(e) => setExtendCheckOut(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white dark:bg-[#0f141c] border-2 border-amber-400 dark:border-amber-700 focus:outline-none focus:border-amber-500 rounded-lg text-gray-800 dark:text-gray-200 font-semibold"
                      />
                    </div>

                    {/* Extra payment preview */}
                    {extendCheckOut && extendCheckOut > selectedBooking.checkOutDate && (() => {
                      const extraNights = Math.round((new Date(extendCheckOut).getTime() - new Date(selectedBooking.checkOutDate).getTime()) / (1000 * 60 * 60 * 24));
                      const pricePerNight = ROOM_PRICES[selectedBooking.roomType] ?? 0;
                      const extraCost = extraNights * pricePerNight;
                      return (
                        <div className="flex items-center justify-between px-3 py-2 bg-white dark:bg-[#0f141c] rounded-lg border-2 border-amber-300 dark:border-amber-700">
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">
                            +{extraNights} night{extraNights !== 1 ? 's' : ''} × ₱{pricePerNight.toLocaleString()}
                          </span>
                          <span className="text-sm font-black font-mono text-amber-700 dark:text-amber-300">
                            +₱{extraCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      );
                    })()}

                    {/* Payment mode note — collected in confirmation step */}
                    <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold text-center">
                      Payment mode and reference number will be confirmed in the next step.
                    </p>

                    {/* Confirm / Cancel extend */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          if (!extendCheckOut || extendCheckOut <= selectedBooking.checkOutDate) {
                            alert('Please select a new check-out date that is after the current one.');
                            return;
                          }
                          if (extendPaymentMode === 'GCash' && !extendReferenceNumber.trim()) {
                            alert('Please enter the GCash Reference Number.');
                            return;
                          }
                          // Open confirmation modal (penalty = 0 for normal extend, non-zero if from overstay)
                          setPendingOverstayPenaltyForExtend(0);
                          setShowExtendConfirm(true);
                        }}
                        className="py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Review & Confirm
                      </button>
                      <button
                        onClick={() => { setShowExtend(false); setExtendCheckOut(''); setExtendReferenceNumber(''); }}
                        className="py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Action buttons based on status */}
                {selectedBooking.status === 'Pending' && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onUpdateBookingStatus(selectedBooking.id, 'Checked-in');
                        setSelectedBooking(null);
                      }}
                      className="py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Check-In
                    </button>
                    <button
                      onClick={() => {
                        onUpdateBookingStatus(selectedBooking.id, 'Cancelled');
                        setSelectedBooking(null);
                      }}
                      className="py-2.5 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      Cancel Booking
                    </button>
                  </div>
                )}
                {selectedBooking.status === 'Checked-in' && !showExtend && !showEarlyCheckout && !showOverstayCheckout && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        const scheduledOut = selectedBooking.checkOutDate;
                        if (today < scheduledOut) {
                          // Guest leaving before scheduled date → early checkout (refund)
                          setShowEarlyCheckout(true);
                        } else if (today > scheduledOut) {
                          // Guest stayed past scheduled date → overstay (penalty)
                          setShowOverstayCheckout(true);
                        } else {
                          // Exactly on time
                          onUpdateBookingStatus(selectedBooking.id, 'Checked-out');
                          setSelectedBooking(null);
                        }
                      }}
                      className="py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Check-Out
                    </button>
                    <button
                      onClick={() => {
                        setExtendCheckOut(selectedBooking.checkOutDate);
                        setShowExtend(true);
                      }}
                      className="py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" />
                      Extend Stay
                    </button>
                  </div>
                )}

                {/* Early Check-Out Confirmation Panel */}
                {selectedBooking.status === 'Checked-in' && showEarlyCheckout && (() => {
                  const today = new Date().toISOString().split('T')[0];
                  const checkedInDate = selectedBooking.checkInDate;
                  const scheduledOut  = selectedBooking.checkOutDate;
                  const pricePerNight = ROOM_PRICES[selectedBooking.roomType] ?? 0;

                  const bookedNights  = Math.max(1, Math.round(
                    (new Date(scheduledOut).getTime() - new Date(checkedInDate).getTime()) / 86400000
                  ));
                  const usedNights    = Math.max(1, Math.round(
                    (new Date(today).getTime() - new Date(checkedInDate).getTime()) / 86400000
                  ));
                  const unusedNights  = Math.max(0, bookedNights - usedNights);
                  const refundAmount  = unusedNights * pricePerNight;

                  return (
                    <div className="p-4 bg-rose-50 dark:bg-rose-950/20 rounded-xl border-2 border-rose-300 dark:border-rose-700 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                          <RotateCcw className="w-3.5 h-3.5" />
                          Early Check-Out
                        </p>
                        <button
                          onClick={() => setShowEarlyCheckout(false)}
                          className="text-rose-400 hover:text-rose-600 dark:hover:text-rose-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Breakdown rows */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Booked duration</span>
                          <span className="font-bold">{bookedNights} night{bookedNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Days used</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{usedNights} night{usedNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Unused days</span>
                          <span className="font-bold text-rose-600 dark:text-rose-400">{unusedNights} night{unusedNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1.5 border-t border-rose-200 dark:border-rose-800">
                          <span className="font-bold text-rose-700 dark:text-rose-300 flex items-center gap-1">
                            <RotateCcw className="w-3 h-3" /> Refund Amount
                          </span>
                          <span className="text-base font-black font-mono text-rose-600 dark:text-rose-400">
                            {refundAmount > 0 ? `₱${refundAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '₱0.00'}
                          </span>
                        </div>
                      </div>

                      {refundAmount === 0 && (
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center">
                          No refund — guest already used all paid nights.
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setShowEarlyCheckout(false)}
                          className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onEarlyCheckout(selectedBooking.id, today, refundAmount);
                            setShowEarlyCheckout(false);
                            setSelectedBooking(null);
                          }}
                          className="py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <LogOut className="w-3 h-3" />
                          Confirm Check-Out
                        </button>
                      </div>
                    </div>
                  );
                })()}
                {/* Overstay Check-Out Confirmation Panel */}
                {selectedBooking.status === 'Checked-in' && showOverstayCheckout && (() => {
                  const today           = new Date().toISOString().split('T')[0];
                  const checkedInDate   = selectedBooking.checkInDate;
                  const scheduledOut    = selectedBooking.checkOutDate;
                  const pricePerNight   = ROOM_PRICES[selectedBooking.roomType] ?? 0;

                  const bookedNights    = Math.max(1, Math.round(
                    (new Date(scheduledOut).getTime() - new Date(checkedInDate).getTime()) / 86400000
                  ));
                  const actualNights    = Math.max(1, Math.round(
                    (new Date(today).getTime() - new Date(checkedInDate).getTime()) / 86400000
                  ));
                  const overstayDays    = Math.max(0, actualNights - bookedNights);
                  const penaltyAmount   = overstayDays * pricePerNight;

                  return (
                    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-xl border-2 border-orange-400 dark:border-orange-600 space-y-3">
                      {/* Header */}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-black text-orange-700 dark:text-orange-400 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          Overstay Detected
                        </p>
                        <button
                          onClick={() => setShowOverstayCheckout(false)}
                          className="text-orange-400 hover:text-orange-600 dark:hover:text-orange-300"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Warning banner */}
                      <div className="flex items-start gap-2 px-3 py-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg border border-orange-300 dark:border-orange-700">
                        <AlertTriangle className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                        <p className="text-[10px] text-orange-700 dark:text-orange-300 font-semibold leading-snug">
                          Guest stayed beyond the scheduled check-out date of <span className="font-black">{scheduledOut}</span>.
                          An overstay penalty applies.
                        </p>
                      </div>

                      {/* Breakdown rows */}
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Scheduled check-out</span>
                          <span className="font-bold font-mono">{scheduledOut}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Actual check-out</span>
                          <span className="font-bold font-mono text-orange-600 dark:text-orange-400">{today}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Booked nights</span>
                          <span className="font-bold">{bookedNights} night{bookedNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Actual nights stayed</span>
                          <span className="font-bold text-orange-600 dark:text-orange-400">{actualNights} night{actualNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 dark:text-gray-300">
                          <span>Nightly rate</span>
                          <span className="font-bold font-mono">₱{pricePerNight.toLocaleString()}</span>
                        </div>

                        {/* Overstay penalty — highlighted danger row */}
                        <div className="flex justify-between items-center px-2 py-1.5 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-300 dark:border-rose-700">
                          <span className="font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" />
                            Overstay Days
                          </span>
                          <span className="font-black text-rose-600 dark:text-rose-400">
                            {overstayDays} day{overstayDays !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {/* Penalty amount */}
                        <div className="flex items-center justify-between pt-1.5 border-t-2 border-orange-300 dark:border-orange-700">
                          <div>
                            <span className="font-black text-orange-700 dark:text-orange-300 text-xs uppercase tracking-wide flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3" />
                              Penalty Amount
                            </span>
                            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-normal mt-0.5">
                              {overstayDays} day{overstayDays !== 1 ? 's' : ''} × ₱{pricePerNight.toLocaleString()} / night
                            </p>
                          </div>
                          <span className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                            ₱{penaltyAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Updated total due */}
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-100 dark:bg-slate-800/60 rounded-lg border border-slate-300 dark:border-slate-600">
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Updated Total Due</span>
                          <span className="text-sm font-black font-mono text-gray-900 dark:text-white">
                            ₱{(selectedBooking.price + penaltyAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setShowOverstayCheckout(false)}
                          className="py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onOverstayCheckout(selectedBooking.id, today, overstayDays, penaltyAmount);
                            setShowOverstayCheckout(false);
                            setSelectedBooking(null);
                          }}
                          className="py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <LogOut className="w-3 h-3" />
                          Confirm & Charge ₱{penaltyAmount.toLocaleString()}
                        </button>
                      </div>

                      {/* ── Extend Stay from overstay — guest wants to officially extend ── */}
                      <div className="pt-1 border-t border-orange-200 dark:border-orange-800">
                        <p className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold text-center mb-2">
                          Guest wants to stay longer instead?
                        </p>
                        <button
                          onClick={() => {
                            // Pre-fill new check-out from today as the new baseline
                            setExtendCheckOut(today);
                            setPendingOverstayPenaltyForExtend(penaltyAmount);
                            setShowOverstayCheckout(false);
                            setShowExtend(true);
                          }}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          Extend Stay Instead (incl. ₱{penaltyAmount.toLocaleString()} overstay charge)
                        </button>
                      </div>
                    </div>
                  );
                })()}
                <button
                  onClick={() => { setSelectedBooking(null); setShowExtend(false); setShowEarlyCheckout(false); setShowOverstayCheckout(false); setExtendCheckOut(''); setExtendReferenceNumber(''); }}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors border border-slate-200 dark:border-slate-700"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* EXTEND STAY CONFIRMATION MODAL */}
      <AnimatePresence>
        {showExtendConfirm && selectedBooking && (() => {
          const pricePerNight   = ROOM_PRICES[selectedBooking.roomType] ?? 0;
          const extraNights     = Math.round(
            (new Date(extendCheckOut).getTime() - new Date(selectedBooking.checkOutDate).getTime()) / (1000 * 60 * 60 * 24)
          );
          const extensionCost   = extraNights * pricePerNight;
          const overstayPenalty = pendingOverstayPenaltyForExtend;
          const totalCharge     = extensionCost + overstayPenalty;

          return (
            <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center sm:p-4">
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={() => setShowExtendConfirm(false)}
              />
              <motion.div
                initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="relative w-full sm:max-w-md bg-white dark:bg-[#121822] sm:rounded-2xl rounded-t-2xl shadow-2xl border-2 border-amber-300 dark:border-amber-600 overflow-hidden"
              >
                {/* Accent top bar */}
                <div className="h-1 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

                {/* Header */}
                <div className="px-5 pt-5 pb-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center">
                      <CalendarPlus className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-wide">Confirm Extension</h3>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Review all charges before processing</p>
                    </div>
                  </div>
                  <button onClick={() => setShowExtendConfirm(false)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">

                  {/* Guest + room info strip */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 ring-2 ring-cyan-200 dark:ring-cyan-800 flex items-center justify-center font-black text-xs shrink-0">
                      {selectedBooking.guestName.split(' ').slice(0, 2).map((n) => n[0]).join('')}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{selectedBooking.guestName}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">Room {selectedBooking.roomNumber} · {selectedBooking.roomType}</p>
                    </div>
                    {getStatusBadge(selectedBooking.status)}
                  </div>

                  {/* Extension Information section */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Extension Information</p>

                    <div className="bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-200 dark:border-amber-700 overflow-hidden">
                      {/* Dates */}
                      <div className="grid grid-cols-2 divide-x divide-amber-200 dark:divide-amber-700 border-b border-amber-200 dark:border-amber-700">
                        <div className="p-3">
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">Previous Check-out</p>
                          <p className="text-sm font-black text-gray-800 dark:text-gray-100 font-mono">{selectedBooking.checkOutDate}</p>
                        </div>
                        <div className="p-3">
                          <p className="text-[9px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-0.5">New Check-out</p>
                          <p className="text-sm font-black text-amber-600 dark:text-amber-400 font-mono">{extendCheckOut}</p>
                        </div>
                      </div>

                      {/* Extension days + rate */}
                      <div className="p-3 space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Extension Days</span>
                          <span className="font-black text-amber-700 dark:text-amber-300">+{extraNights} day{extraNights !== 1 ? 's' : ''}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-gray-600 dark:text-gray-300 font-medium">Nightly Rate</span>
                          <span className="font-bold font-mono text-gray-800 dark:text-gray-200">₱{pricePerNight.toLocaleString()}/night</span>
                        </div>
                        <div className="flex justify-between items-center text-xs pt-1 border-t border-amber-200 dark:border-amber-700">
                          <span className="font-bold text-gray-700 dark:text-gray-200">Extension Cost</span>
                          <span className="font-black font-mono text-amber-600 dark:text-amber-300">+₱{extensionCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    </div>

                    {/* Overstay penalty row — only when coming from overstay context */}
                    {overstayPenalty > 0 && (
                      <div className="flex items-center justify-between px-3 py-2.5 bg-orange-50 dark:bg-orange-950/20 rounded-xl border-2 border-orange-300 dark:border-orange-700">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 shrink-0" />
                          <div>
                            <p className="text-xs font-bold text-orange-700 dark:text-orange-400">Existing Overstay Penalty</p>
                            <p className="text-[10px] text-orange-500 dark:text-orange-400 font-medium">Collected together with extension payment</p>
                          </div>
                        </div>
                        <span className="text-sm font-black font-mono text-orange-600 dark:text-orange-400 shrink-0 ml-2">
                          +₱{overstayPenalty.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    {/* Total additional charges */}
                    <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl shadow-md shadow-amber-500/20">
                      <div>
                        <p className="text-[10px] font-black text-white/80 uppercase tracking-wider">Total Additional Charges</p>
                        {overstayPenalty > 0 && (
                          <p className="text-[10px] text-white/60 font-medium mt-0.5">
                            Extension ₱{extensionCost.toLocaleString()} + Overstay ₱{overstayPenalty.toLocaleString()}
                          </p>
                        )}
                      </div>
                      <span className="text-2xl font-black font-mono text-white tracking-tight">
                        ₱{totalCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Payment mode */}
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Payment Mode</p>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Cash', 'GCash'] as const).map((mode) => (
                        <button
                          key={mode}
                          type="button"
                          onClick={() => { setExtendPaymentMode(mode); setExtendReferenceNumber(''); }}
                          className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all ${
                            extendPaymentMode === mode
                              ? mode === 'GCash'
                                ? 'bg-blue-500 border-blue-500 text-white shadow-md shadow-blue-500/25'
                                : 'bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25'
                              : 'bg-white dark:bg-[#0f141c] border-slate-300 dark:border-slate-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          {mode === 'GCash' ? '📱 GCash' : '💵 Cash'}
                        </button>
                      ))}
                    </div>
                    {extendPaymentMode === 'GCash' && (
                      <input
                        type="text"
                        placeholder="GCash Reference Number *"
                        value={extendReferenceNumber}
                        onChange={(e) => setExtendReferenceNumber(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs bg-white dark:bg-[#0f141c] border-2 border-blue-400 dark:border-blue-700 focus:outline-none focus:border-blue-500 rounded-xl text-gray-800 dark:text-gray-200 font-mono"
                      />
                    )}
                  </div>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setShowExtendConfirm(false)}
                    className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all border border-slate-200 dark:border-slate-700"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => {
                      if (extendPaymentMode === 'GCash' && !extendReferenceNumber.trim()) {
                        alert('Please enter the GCash Reference Number.');
                        return;
                      }
                      onExtendBooking(
                        selectedBooking.id,
                        extendCheckOut,
                        extensionCost,
                        extendPaymentMode,
                        extendReferenceNumber,
                        overstayPenalty > 0 ? overstayPenalty : undefined,
                      );
                      setShowExtendConfirm(false);
                      setShowExtend(false);
                      setShowOverstayCheckout(false);
                      setExtendCheckOut('');
                      setExtendPaymentMode('Cash');
                      setExtendReferenceNumber('');
                      setPendingOverstayPenaltyForExtend(0);
                      setSelectedBooking(null);
                    }}
                    className="py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-amber-500/30 flex items-center justify-center gap-1.5"
                  >
                    <CalendarPlus className="w-3.5 h-3.5" />
                    Confirm Extension
                  </button>
                </div>
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      {/* LIGHTBOX — Full screen ID image viewer */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative max-w-3xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute -top-4 -right-4 z-10 w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxUrl}
                alt="ID Full View"
                className="w-full rounded-2xl shadow-2xl object-contain max-h-[80vh]"
              />
              <p className="text-center text-white/60 text-xs mt-3 font-medium tracking-wide">
                Click outside or × to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}