import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  TrendingUp,
  Users,
  CheckCircle2,
  AlertTriangle,
  BarChart3,
  Loader2,
  FileWarning,
  ChevronDown,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BookingRecord, RoomRecord } from '../types';

interface ExportViewProps {
  bookings: BookingRecord[];
  rooms: RoomRecord[];
}

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const START_YEAR = 2026;
const END_YEAR   = 2050;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getDateKey(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 10); // YYYY-MM-DD
}

function getMonthKey(iso: string | null | undefined): string {
  if (!iso) return '';
  return iso.slice(0, 7); // YYYY-MM
}

function fmtCurrency(n: number): string {
  return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate(); // month is 1-based
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ExportView({ bookings, rooms }: ExportViewProps) {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1); // 1-based
  const [selectedYear,  setSelectedYear]  = useState(now.getFullYear());
  const [exporting,     setExporting]     = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError,   setExportError]   = useState('');

  const yearOptions = Array.from({ length: END_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);
  const monthKey    = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`; // YYYY-MM

  // ── Derived summary data ──────────────────────────────────────────────────

  const summary = useMemo(() => {
    const monthBookings = bookings.filter((b) => getMonthKey(b.createdAt) === monthKey);

    const totalBookings    = monthBookings.length;
    const checkedIn        = monthBookings.filter((b) => b.status === 'Checked-in').length;
    const checkedOut       = monthBookings.filter((b) => b.status === 'Checked-out').length;
    const pending          = monthBookings.filter((b) => b.status === 'Pending').length;
    const cancelled        = monthBookings.filter((b) => b.status === 'Cancelled').length;
    const earlyCheckouts   = monthBookings.filter((b) => (b.refundAmount ?? 0) > 0).length;
    const extendedStays    = monthBookings.filter((b) => (b.overstayPenalty ?? 0) > 0).length;
    const overstayCases    = extendedStays; // same field

    // Revenue = price − keyDeposit − refunds
    const confirmedBookings = monthBookings.filter(
      (b) => b.status === 'Checked-in' || b.status === 'Checked-out',
    );
    const bookingRevenue    = confirmedBookings.reduce((s, b) => s + b.price - (b.keyDeposit ?? 0), 0);
    const refundDeductions  = monthBookings.reduce((s, b) => s + (b.refundAmount ?? 0), 0);
    const overstayRevenue   = monthBookings.reduce((s, b) => s + (b.overstayPenalty ?? 0), 0);
    const netRevenue        = bookingRevenue - refundDeductions;

    // Occupancy rate: occupied room-nights / total room-nights in the month
    const totalDays    = daysInMonth(selectedYear, selectedMonth);
    const totalRooms   = rooms.reduce((s, r) => s + r.totalRooms, 0);
    const occupiedNights = confirmedBookings.reduce((s, b) => {
      const inDate  = new Date(b.checkInDate);
      const outDate = new Date(b.checkOutDate);
      return s + Math.max(0, Math.round((outDate.getTime() - inDate.getTime()) / 86400000));
    }, 0);
    const occupancyRate = totalRooms > 0
      ? Math.round((occupiedNights / (totalRooms * totalDays)) * 100)
      : 0;

    return {
      totalBookings, checkedIn, checkedOut, pending, cancelled,
      earlyCheckouts, extendedStays, overstayCases,
      bookingRevenue, refundDeductions, overstayRevenue, netRevenue,
      occupancyRate,
    };
  }, [bookings, rooms, monthKey, selectedMonth, selectedYear]);

  const hasData = summary.totalBookings > 0;

  // ── Excel generation ──────────────────────────────────────────────────────

  const handleExport = async () => {
    if (!hasData) {
      setExportError('No booking records found for the selected period.');
      return;
    }

    setExporting(true);
    setExportError('');

    try {
      await new Promise((r) => setTimeout(r, 300)); // slight delay for UX

      const wb = XLSX.utils.book_new();
      const monthName  = MONTHS[selectedMonth - 1];
      const totalDays  = daysInMonth(selectedYear, selectedMonth);

      // Helper: add a sheet with auto column widths
      function addSheet(name: string, rows: (string | number | null)[][], boldRows: number[] = []) {
        const ws = XLSX.utils.aoa_to_sheet(rows);

        // Auto column widths
        const colWidths: number[] = [];
        rows.forEach((row) => {
          row.forEach((cell, ci) => {
            const len = cell !== null ? String(cell).length : 0;
            colWidths[ci] = Math.max(colWidths[ci] ?? 12, Math.min(len + 4, 50));
          });
        });
        ws['!cols'] = colWidths.map((w) => ({ wch: w }));

        // Bold header row + any specified rows
        const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
        for (let R = range.s.r; R <= range.e.r; R++) {
          const isBold = R === 0 || boldRows.includes(R);
          for (let C = range.s.c; C <= range.e.c; C++) {
            const addr = XLSX.utils.encode_cell({ r: R, c: C });
            if (!ws[addr]) continue;
            ws[addr].s = {
              font: { bold: isBold, name: 'Calibri', sz: isBold ? 11 : 10 },
              alignment: { vertical: 'center', wrapText: false },
              border: {
                top:    { style: 'thin', color: { rgb: 'D0D5DD' } },
                bottom: { style: 'thin', color: { rgb: 'D0D5DD' } },
                left:   { style: 'thin', color: { rgb: 'D0D5DD' } },
                right:  { style: 'thin', color: { rgb: 'D0D5DD' } },
              },
            };
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, name);
      }

      // ── Sheet 1: Revenue Report ────────────────────────────────────────────
      const confirmedBookings = bookings.filter(
        (b) => (b.status === 'Checked-in' || b.status === 'Checked-out') &&
               getMonthKey(b.createdAt) === monthKey,
      );

      // Build a day → revenue map
      const revenueByDay: Record<string, number> = {};
      for (let d = 1; d <= totalDays; d++) {
        const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        revenueByDay[dateStr] = 0;
      }
      confirmedBookings.forEach((b) => {
        const day = getDateKey(b.checkedInAt ?? b.createdAt);
        if (revenueByDay[day] !== undefined) {
          const net = b.price - (b.keyDeposit ?? 0) - (b.refundAmount ?? 0) + (b.overstayPenalty ?? 0);
          revenueByDay[day] += net;
        }
      });

      const revenueRows: (string | number | null)[][] = [
        [`Monthly Revenue Report — ${monthName} ${selectedYear}`, null],
        [],
        ['Date', 'Revenue (₱)'],
        ...Object.entries(revenueByDay).map(([date, rev]) => {
          const d = new Date(date + 'T00:00:00');
          const label = d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
          return [label, rev];
        }),
        [],
        ['Total Monthly Revenue', summary.netRevenue],
      ];
      addSheet('Revenue Report', revenueRows, [revenueRows.length - 1]);

      // ── Sheet 2: Booking Statistics (raw data) ────────────────────────────
      const monthBookings = bookings.filter((b) => getMonthKey(b.createdAt) === monthKey);

      // Price breakdown helper — returns a readable string of each charge component
      const buildPriceBreakdown = (b: BookingRecord): string => {
        const parts: string[] = [];
        const nights = Math.max(1, Math.round(
          (new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / 86400000,
        ));
        const deposit        = b.keyDeposit       ?? 0;
        const discount       = b.discountAmount   ?? 0;
        const refund         = b.refundAmount      ?? 0;
        const overstayPenalty = b.overstayPenalty ?? 0;
        const extensionCost  = b.extensionCost    ?? 0;

        parts.push(`${nights} night${nights !== 1 ? 's' : ''} x ₱${((b.price - deposit + discount - overstayPenalty - extensionCost) / nights).toFixed(0)}/night`);
        if (deposit > 0)        parts.push(`Key Deposit: ₱${deposit.toLocaleString()}`);
        if (discount > 0)       parts.push(`Discount: -₱${discount.toLocaleString()}`);
        if (overstayPenalty > 0) parts.push(`Overstay Penalty: +₱${overstayPenalty.toLocaleString()}`);
        if (extensionCost > 0)  parts.push(`Extension: +₱${extensionCost.toLocaleString()}`);
        if (refund > 0)         parts.push(`Refund: -₱${refund.toLocaleString()}`);
        return parts.join(' | ');
      };

      // Format time helper — converts HH:MM to 12-hour format, or derives from ISO timestamp
      const fmtTime = (timeStr?: string | null, isoTimestamp?: string | null): string => {
        const raw = timeStr ?? (isoTimestamp
          ? (() => { const d = new Date(isoTimestamp); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; })()
          : null);
        if (!raw) return '—';
        const [h, m] = raw.split(':').map(Number);
        return `${String(h % 12 || 12).padStart(2,'0')}:${String(m).padStart(2,'0')} ${h >= 12 ? 'PM' : 'AM'}`;
      };

      const bookingStatsRows: (string | number | null)[][] = [
        // Header row — all 15 columns
        [
          'Booking ID',
          'Guest Name',
          'Border Email Address',
          'Contact Number',
          'Room Type',
          'Room No.',
          'Check-In Date',
          'Check-Out Date',
          'Check-In Time',
          'Check-Out Time',
          'Status',
          'Payment Mode',
          'Reference No.',
          'Booking Price (Breakdown)',
          'Total',
        ],
        // Data rows — one row per booking, no summary block
        ...monthBookings.map((b) => [
          b.id,
          b.guestName,
          b.email || '—',
          b.contactNumber || '—',
          b.roomType,
          b.roomNumber,
          b.checkInDate,
          b.checkOutDate,
          fmtTime(b.checkInTime, b.checkedInAt),
          fmtTime(b.checkOutTime, b.checkedOutAt),
          b.status,
          b.paymentMode ?? 'Cash',
          b.paymentMode === 'GCash' && b.referenceNumber ? b.referenceNumber : '-',
          buildPriceBreakdown(b),
          b.price,
        ]),
      ];
      addSheet('Booking Statistics', bookingStatsRows);

      // ── Sheet 3: Financial Summary ────────────────────────────────────────
      const extensionRevenue = bookings
        .filter((b) => getMonthKey(b.createdAt) === monthKey)
        .reduce((s, b) => s + (b.overstayPenalty ?? 0), 0);

      // Base booking revenue (excluding key deposit & before refunds)
      const baseRevenue = confirmedBookings.reduce(
        (s, b) => s + b.price - (b.keyDeposit ?? 0),
        0,
      );

      const financialRows: (string | number | null)[][] = [
        [`Financial Summary — ${monthName} ${selectedYear}`, null],
        [],
        ['Category', 'Amount (₱)'],
        ['Booking Revenue',    baseRevenue],
        ['Overstay Penalties', extensionRevenue],
        ['Refund Deductions',  -summary.refundDeductions],
        [],
        ['Net Revenue',        summary.netRevenue],
        [],
        ['Key Deposits Collected (refundable, not counted as revenue)',
          confirmedBookings.reduce((s, b) => s + (b.keyDeposit ?? 0), 0)],
        [],
        ['Generated on', new Date().toLocaleString('en-PH')],
        ['Report Period', `${monthName} ${selectedYear}`],
        ['Exported by', 'AK Seafarers Admin Panel'],
      ];
      addSheet('Financial Summary', financialRows, [7]);

      // ── Write & download ──────────────────────────────────────────────────
      const filename = `Monthly_Report_${monthName}_${selectedYear}.xlsx`;
      XLSX.writeFile(wb, filename, { bookType: 'xlsx', type: 'binary', cellStyles: true });

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 4000);
    } catch (err) {
      console.error('Export failed:', err);
      setExportError('Export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  // ── Stat card helper ──────────────────────────────────────────────────────

  const StatCard = ({
    label, value, sub, color,
  }: { label: string; value: string | number; sub?: string; color: string }) => (
    <div className={`p-3 sm:p-4 rounded-2xl border-2 ${color} space-y-1 min-w-0 overflow-hidden`}>
      <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 leading-tight">{label}</p>
      <p className="text-base sm:text-xl font-black tracking-tight text-gray-900 dark:text-white break-all leading-tight">{value}</p>
      {sub && <p className="text-[9px] sm:text-[10px] text-gray-400 dark:text-gray-500 font-medium">{sub}</p>}
    </div>
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pt-16 lg:pt-0">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <FileSpreadsheet className="w-4 h-4 text-white" />
            </div>
            Export Reports
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">
            Generate and download monthly Excel reports for business analytics
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT: Controls ── */}
        <div className="lg:col-span-1 space-y-4">

          {/* Period selector card */}
          <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-500" />
              <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Report Period</p>
            </div>

            {/* Month selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Month</label>
              <div className="relative">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-[#0f141c] border-2 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 rounded-xl text-gray-800 dark:text-gray-200 cursor-pointer transition-colors"
                >
                  {MONTHS.map((m, i) => (
                    <option key={m} value={i + 1}>{m}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Year selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Year</label>
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="w-full appearance-none px-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-[#0f141c] border-2 border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-500 rounded-xl text-gray-800 dark:text-gray-200 cursor-pointer transition-colors"
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Selected period display */}
            <div className="p-3 bg-cyan-50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200 dark:border-cyan-800/50">
              <p className="text-[10px] font-bold text-cyan-600 dark:text-cyan-400 uppercase tracking-widest mb-1">Selected Period</p>
              <p className="text-lg font-black text-cyan-700 dark:text-cyan-300">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </p>
            </div>
          </div>

          {/* Worksheets info card */}
          <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5 space-y-3">
            <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Included Worksheets</p>
            {[
              { num: '1', label: 'Revenue Report',     sub: 'Daily revenue breakdown',    color: 'text-emerald-500' },
              { num: '2', label: 'Booking Statistics', sub: 'Full raw booking data list', color: 'text-cyan-500'    },
              { num: '3', label: 'Financial Summary',  sub: 'Net revenue + categories',   color: 'text-amber-500'   },
            ].map((s) => (
              <div key={s.num} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-lg text-[10px] font-black flex items-center justify-center bg-slate-100 dark:bg-slate-800 ${s.color}`}>
                  {s.num}
                </span>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{s.label}</p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500">{s.sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Export button */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl text-sm font-black tracking-wide shadow-lg shadow-emerald-500/25 transition-all flex items-center justify-center gap-2.5"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating Report…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export to Excel
              </>
            )}
          </button>

          {/* Success / Error feedback */}
          <AnimatePresence>
            {exportSuccess && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2.5 p-3 bg-emerald-50 dark:bg-emerald-950/30 border-2 border-emerald-300 dark:border-emerald-700 rounded-xl"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-700 dark:text-emerald-400">Export Successful</p>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500 font-medium">
                    Monthly_Report_{MONTHS[selectedMonth - 1]}_{selectedYear}.xlsx downloaded
                  </p>
                </div>
              </motion.div>
            )}
            {exportError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="flex items-center gap-2.5 p-3 bg-rose-50 dark:bg-rose-950/30 border-2 border-rose-300 dark:border-rose-700 rounded-xl"
              >
                <FileWarning className="w-4 h-4 text-rose-500 shrink-0" />
                <p className="text-xs font-bold text-rose-700 dark:text-rose-400">{exportError}</p>
                <button onClick={() => setExportError('')} className="ml-auto text-rose-400 hover:text-rose-600 text-xs font-black">✕</button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── RIGHT: Preview Summary ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Header */}
          <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-500" />
                <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Report Preview</p>
              </div>
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                {MONTHS[selectedMonth - 1]} {selectedYear}
              </span>
            </div>

            {!hasData ? (
              <div className="py-10 text-center space-y-2">
                <FileWarning className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto" />
                <p className="text-sm font-bold text-gray-400 dark:text-gray-500">No records for this period</p>
                <p className="text-xs text-gray-400 dark:text-gray-600">Select a different month or year to preview data.</p>
              </div>
            ) : (
              <div className="space-y-4">

                {/* Revenue cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <StatCard
                    label="Net Revenue"
                    value={fmtCurrency(summary.netRevenue)}
                    color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                  />
                  <StatCard
                    label="Booking Revenue"
                    value={fmtCurrency(summary.bookingRevenue)}
                    color="bg-cyan-50 dark:bg-cyan-950/20 border-cyan-200 dark:border-cyan-800/50"
                  />
                  <StatCard
                    label="Overstay Collected"
                    value={fmtCurrency(summary.overstayRevenue)}
                    color="bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800/50"
                  />
                </div>

                {/* Booking stat cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatCard
                    label="Total Bookings"
                    value={summary.totalBookings}
                    color="bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                  />
                  <StatCard
                    label="Checked-In"
                    value={summary.checkedIn}
                    color="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50"
                  />
                  <StatCard
                    label="Checked-Out"
                    value={summary.checkedOut}
                    color="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50"
                  />
                  <StatCard
                    label="Cancelled"
                    value={summary.cancelled}
                    color="bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50"
                  />
                </div>

                {/* More stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                  <StatCard
                    label="Early Check-Outs"
                    value={summary.earlyCheckouts}
                    color="bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                  />
                  <StatCard
                    label="Extended Stays"
                    value={summary.extendedStays}
                    color="bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/50"
                  />
                </div>

                {/* Refund deduction row */}
                {summary.refundDeductions > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-200 dark:border-rose-800/50">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                      <p className="text-xs font-bold text-rose-700 dark:text-rose-400">Total Refunds Deducted</p>
                    </div>
                    <span className="text-sm font-black font-mono text-rose-600 dark:text-rose-400 pl-5 sm:pl-0">
                      − {fmtCurrency(summary.refundDeductions)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Financial summary table preview */}
          {hasData && (
            <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Financial Summary Preview</p>
              </div>
              <div className="space-y-1.5">
                {[
                  { label: 'Overstay Penalties', value: summary.overstayRevenue,    color: 'text-orange-600 dark:text-orange-400', prefix: '+' },
                  { label: 'Refund Deductions',  value: -summary.refundDeductions,  color: 'text-rose-600 dark:text-rose-400',    prefix: '' },
                ].map((row) => (
                  <div key={row.label} className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-0.5 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/30 text-xs">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">{row.label}</span>
                    <span className={`font-black font-mono ${row.color}`}>
                      {row.prefix}{fmtCurrency(Math.abs(row.value))}
                    </span>
                  </div>
                ))}
                <div className="flex justify-between items-center px-3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 mt-2">
                  <span className="text-white font-black text-xs uppercase tracking-wider">Net Revenue</span>
                  <span className="text-white font-black font-mono text-base">{fmtCurrency(summary.netRevenue)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Guest list preview (top 5) */}
          {hasData && (
            <div className="bg-white dark:bg-[#151c27] rounded-2xl border-2 border-slate-200 dark:border-slate-700 p-5">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-cyan-500" />
                <p className="text-xs font-black text-gray-700 dark:text-gray-200 uppercase tracking-widest">Recent Bookings This Period</p>
                <span className="ml-auto text-[10px] text-gray-400 dark:text-gray-500 font-medium">Top 5 · full list in Excel</span>
              </div>
              <div className="space-y-2">
                {bookings
                  .filter((b) => getMonthKey(b.createdAt) === monthKey)
                  .slice(0, 5)
                  .map((b) => (
                    <div key={b.id} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/30 text-xs">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-cyan-100 dark:bg-cyan-900/40 flex items-center justify-center font-black text-[10px] text-cyan-600 dark:text-cyan-400 shrink-0">
                          {b.guestName.split(' ').slice(0,2).map(n => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-gray-800 dark:text-gray-200 truncate">{b.guestName}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">Room {b.roomNumber} · {b.roomType}</p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-black font-mono text-gray-900 dark:text-white">{fmtCurrency(b.price)}</p>
                        <p className={`text-[10px] font-bold ${
                          b.status === 'Checked-in'  ? 'text-emerald-500' :
                          b.status === 'Checked-out' ? 'text-blue-500'    :
                          b.status === 'Pending'     ? 'text-amber-500'   : 'text-rose-500'
                        }`}>{b.status}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}