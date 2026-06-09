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
  onExtendBooking: (id: string, newCheckOut: string, extraPrice: number, extendPaymentMode: 'Cash' | 'GCash', extendReferenceNumber: string) => void;
}

export default function BookingManagement({
  bookings,
  rooms,
  settings,
  onAddBooking,
  onUpdateBookingStatus,
  onExtendBooking,
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
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
        {getStatusIcon(status)}
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-5 pt-16 lg:pt-0">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-slate-300 dark:border-[#2d3748] pb-5">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white dark:bg-[#151c27] p-4 rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-sm">
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

        {/* Date Filter — single picker: month → day in one control */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
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
              className="w-full text-xs font-bold bg-[#f1f3f6] dark:bg-[#0f141c] text-gray-700 dark:text-gray-300 border-none outline-none focus:ring-1 focus:ring-cyan-500 py-2 px-3 rounded-xl cursor-pointer"
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
      <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-300 dark:border-slate-600 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-[#0f141c] text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-widest border-b-2 border-slate-300 dark:border-slate-600">
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
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors"
                  >
                    {/* Border Name & ID */}
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                          (() => {
                            if (bk.status !== 'Checked-in') return false;
                            const checkOutDay = bk.checkOutDate; // YYYY-MM-DD
                            const checkInTime = bk.checkedInAt ? new Date(bk.checkedInAt) : null;
                            const hours = checkInTime ? checkInTime.getHours() : 12;
                            const minutes = checkInTime ? checkInTime.getMinutes() : 0;
                            const dueAt = new Date(`${checkOutDay}T${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:00`);
                            return new Date() >= dueAt;
                          })()
                            ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                            : 'bg-cyan-100 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400'
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
                        <button
                          onClick={() => setSelectedBooking(bk)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-slate-800 dark:hover:bg-slate-600 dark:text-slate-300 dark:hover:text-white text-xs font-bold transition-all duration-150 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          Details
                        </button>
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
                          No bookings found
                         {selectedDate
                          ? ` for ${new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`
                           : selectedStatus !== 'All' || selectedRoomType !== 'All' || searchQuery
                           ? ' matching your filters'
                           : ''}
                        </p>
                          <p className="text-xs text-gray-300 dark:text-gray-600">
                             Try selecting a different date or adjusting your filters.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* PAGER FOOTER */}
        {filteredList.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-5 py-3 border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0f141c]">

            {/* Record count info */}
            <p className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 shrink-0">
              Showing{' '}
              <span className="text-gray-700 dark:text-gray-300 font-bold">
                {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredList.length)}
              </span>
              {' '}of{' '}
              <span className="text-gray-700 dark:text-gray-300 font-bold">{filteredList.length}</span>
              {' '}records
            </p>

            {/* Page buttons — only shown when more than 1 page */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First */}
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="First page"
                >
                  «
                </button>
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Previous page"
                >
                  ‹
                </button>

                {/* Page number pills — smart windowing with ellipsis */}
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
                  .reduce<(number | '…')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && (p as number) - (arr[idx - 1] as number) > 1) acc.push('…');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((item, idx) =>
                    item === '…' ? (
                      <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-400 dark:text-gray-600 font-bold select-none">
                        …
                      </span>
                    ) : (
                      <button
                        key={item}
                        onClick={() => setCurrentPage(item as number)}
                        className={`w-8 h-8 text-xs font-bold rounded-lg border-2 transition-all ${
                          safePage === item
                            ? 'bg-cyan-500 border-cyan-500 text-white shadow-sm shadow-cyan-500/30'
                            : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {item}
                      </button>
                    )
                  )}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Next page"
                >
                  ›
                </button>
                {/* Last */}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safePage === totalPages}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border-2 border-slate-300 dark:border-slate-600 bg-white dark:bg-[#151c27] text-gray-500 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                  title="Last page"
                >
                  »
                </button>
              </div>
            )}
          </div>
        )}
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
                <div className="p-6 border-b border-[#c8cdd6] dark:border-slate-700 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-500" />
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white font-display">
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
                  className="flex-1 overflow-y-auto p-6 space-y-5"
                >
                  {/* Name fields */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5" />
                      Border Email Address
                    </label>
                    <input
                      id="form-guest-email"
                      type="email"
                      placeholder="Border Email Address"
                      value={guestEmail}
                      onChange={(e) => setGuestEmail(e.target.value)}
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Contact Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                      className="w-full px-4 py-2.5 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                    />
                  </div>

                  {/* Checkin Checkout range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                      <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
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
                          type="number"
                          min="0"
                          placeholder="Enter discount amount"
                          value={discountAmount}
                          onChange={(e) => setDiscountAmount(e.target.value)}
                          className="w-full px-4 py-2.5 text-sm bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 rounded-xl text-amber-700 dark:text-amber-300 font-semibold font-mono"
                        />
                      </div>
                    )}
                  </div>

                  {/* ID Image Upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider font-display flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" />
                      Valid ID 
                    </label>

                    {/* Upload area */}
                    {!idImagePreview ? (
                      <button
                        type="button"
                        onClick={() => idFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl py-6 flex flex-col items-center gap-2 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 dark:hover:border-cyan-600 transition-colors cursor-pointer bg-slate-50 dark:bg-[#0f141c]"
                      >
                        <Upload className="w-6 h-6" />
                        <span className="text-xs font-semibold">Click to upload ID photo</span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">JPG, PNG, WEBP — max 5MB</span>
                      </button>
                    ) : (
                      <div className="relative group rounded-xl overflow-hidden border-2 border-slate-300 dark:border-slate-600">
                        <img
                          src={idImagePreview}
                          alt="ID Preview"
                          className="w-full h-40 object-cover"
                        />
                        {/* Overlay on hover */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
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
                            onClick={() => { setIdImageFile(null); setIdImagePreview(null); if (idFileInputRef.current) idFileInputRef.current.value = ''; }}
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

                    {/* Hidden file input */}
                    <input
                      ref={idFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
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
                <div className="p-6 border-t border-[#c8cdd6] dark:border-slate-700 bg-gray-55/40 dark:bg-[#0e141d] flex flex-col gap-2">
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
                    className="w-full py-2.5 border-2 border-slate-300 dark:border-slate-600 rounded-xl text-xs font-bold hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-600 dark:text-gray-400 transition-colors"
                  >
                    Cancel
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
              className="relative w-full max-w-md bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden max-h-[90vh] flex flex-col"
            >
              {/* Header */}
              <div className="p-5 border-b-2 border-slate-300 dark:border-slate-600 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
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

                {/* Border info */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <User className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Border Name</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.guestName}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Mail className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Email</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.email || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                    <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Contact Number</p>
                      <p className="text-sm font-bold text-gray-900 dark:text-white font-mono">{(selectedBooking as any).contactNumber || '—'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Bed className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room Type</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomType}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Hash className="w-4 h-4 text-cyan-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Room No.</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.roomNumber}</p>
                      </div>
                    </div>
                  </div>

                  {/* Dates row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-In Date</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkInDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-300 dark:border-slate-600">
                      <Calendar className="w-4 h-4 text-rose-400 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-Out Date</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{selectedBooking.checkOutDate}</p>
                      </div>
                    </div>
                  </div>

                  {/* Times row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-3 p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-200 dark:border-emerald-900/50">
                      <Calendar className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-In Time</p>
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
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Check-Out Time</p>
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
                              : selectedBooking.checkedInAt && !selectedBooking.checkOutTime
                                ? (() => {
                                    // Mirror check-in time (was a Pending → Checked-in transition, no check-out time set)
                                    const d = new Date(selectedBooking.checkedInAt);
                                    const h = d.getHours(), m = d.getMinutes();
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayH = h % 12 || 12;
                                    return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                  })()
                              : selectedBooking.checkOutTime
                                ? (() => {
                                    const [h, m] = selectedBooking.checkOutTime!.split(':').map(Number);
                                    const period = h >= 12 ? 'PM' : 'AM';
                                    const displayH = h % 12 || 12;
                                    return `${String(displayH).padStart(2,'0')}:${String(m).padStart(2,'0')} ${period}`;
                                  })()
                                : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

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
                    </div>

                    {/* Total */}
                    <div className="flex items-center justify-between border-t-2 border-cyan-300 dark:border-cyan-700 pt-2">
                      <span className="text-xs font-bold text-cyan-700 dark:text-cyan-300 uppercase tracking-wider">Total</span>
                      <span className="text-lg font-black font-mono text-cyan-600 dark:text-cyan-400">
                        ₱{selectedBooking.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* GCash Reference Number */}
                  {selectedBooking.paymentMode === 'GCash' && selectedBooking.referenceNumber && (
                    <div className="flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-300 dark:border-blue-700">
                      <Hash className="w-4 h-4 text-blue-500 shrink-0" />
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">GCash Reference No.</p>
                        <p className="text-sm font-bold font-mono text-blue-600 dark:text-blue-400">{selectedBooking.referenceNumber}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* ID Image */}
                {selectedBooking.idImageUrl && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1.5">
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
              <div className="p-4 border-t-2 border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-[#0e141d] space-y-2">

                {/* Extend Stay inline form — only for Checked-in */}
                {selectedBooking.status === 'Checked-in' && showExtend && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border-2 border-amber-300 dark:border-amber-700 space-y-3 mb-1">
                    <p className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
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
                      const pricePerNight = { 'Bed space': 250, 'Solo room': 525, 'Couple room': 825, 'Family room': 1200 }[selectedBooking.roomType] ?? 0;
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

                    {/* Payment mode for extension */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {(['Cash', 'GCash'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => { setExtendPaymentMode(mode); setExtendReferenceNumber(''); }}
                            className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                              extendPaymentMode === mode
                                ? mode === 'GCash'
                                  ? 'bg-blue-500 border-blue-500 text-white'
                                  : 'bg-emerald-500 border-emerald-500 text-white'
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
                          className="w-full px-3 py-2 text-xs bg-white dark:bg-[#0f141c] border-2 border-blue-400 dark:border-blue-700 focus:outline-none focus:border-blue-500 rounded-lg text-gray-800 dark:text-gray-200 font-mono mt-1"
                        />
                      )}
                    </div>

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
                          const extraNights = Math.round((new Date(extendCheckOut).getTime() - new Date(selectedBooking.checkOutDate).getTime()) / (1000 * 60 * 60 * 24));
                          const pricePerNight = { 'Bed space': 250, 'Solo room': 525, 'Couple room': 825, 'Family room': 1200 }[selectedBooking.roomType] ?? 0;
                          const extraCost = extraNights * pricePerNight;
                          onExtendBooking(selectedBooking.id, extendCheckOut, extraCost, extendPaymentMode, extendReferenceNumber);
                          setShowExtend(false);
                          setExtendCheckOut('');
                          setExtendPaymentMode('Cash');
                          setExtendReferenceNumber('');
                          setSelectedBooking(null);
                        }}
                        className="py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Confirm Extend
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
                {selectedBooking.status === 'Checked-in' && !showExtend && (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        onUpdateBookingStatus(selectedBooking.id, 'Checked-out');
                        setSelectedBooking(null);
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
                <button
                  onClick={() => { setSelectedBooking(null); setShowExtend(false); setExtendCheckOut(''); setExtendReferenceNumber(''); }}
                  className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
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
              <p className="text-center text-white/50 text-xs mt-3 font-medium">
                Click outside or × to close
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}