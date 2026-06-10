import { useState } from 'react';
import { Settings, Save, RefreshCw, Bed, Key, CheckCircle2, AlertCircle, Hash } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RoomRecord } from '../types';

export interface PriceSettings {
  price_bed_space:   number;
  price_solo_room:   number;
  price_couple_room: number;
  price_family_room: number;
  key_deposit:       number;
}

interface AdminViewProps {
  settings: PriceSettings;
  onSaveSettings: (updated: PriceSettings) => Promise<void>;
  rooms: RoomRecord[];
  onSaveRoomSlots: (roomId: string, totalRooms: number) => Promise<void>;
}

const ROOM_FIELDS: { key: keyof PriceSettings; label: string; desc: string; icon: string }[] = [
  { key: 'price_bed_space',   label: 'Bed Space',   desc: 'Price per night for a shared bed space',        icon: '' },
  { key: 'price_solo_room',   label: 'Solo Room',   desc: 'Price per night for a single occupancy room',   icon: '' },
  { key: 'price_couple_room', label: 'Couple Room', desc: 'Price per night for a couple/double room',      icon: '' },
  { key: 'price_family_room', label: 'Family Room', desc: 'Price per night for a family room (2–3 pax)',   icon: '' },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function AdminView({ settings, onSaveSettings, rooms, onSaveRoomSlots }: AdminViewProps) {
  const [draft, setDraft] = useState<PriceSettings>({ ...settings });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditingPrices,  setIsEditingPrices]  = useState(false);
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);
  const [isEditingSlots,   setIsEditingSlots]   = useState(false);

  // Room slots draft — map roomId → totalRooms
  const [slotsDraft, setSlotsDraft] = useState<Record<string, number>>(
    () => Object.fromEntries(rooms.map((r) => [r.id, r.totalRooms]))
  );


  const isSlotsDirty = rooms.some((r) => slotsDraft[r.id] !== r.totalRooms);

  const handleSlotChange = (roomId: string, raw: string) => {
    const val = parseInt(raw);
    setSlotsDraft((prev) => ({ ...prev, [roomId]: isNaN(val) ? 0 : Math.max(0, val) }));
  };



  const isDirty = Object.keys(draft).some(
    (k) => draft[k as keyof PriceSettings] !== settings[k as keyof PriceSettings]
  ) || isSlotsDirty;

  const handleChange = (key: keyof PriceSettings, raw: string) => {
    const val = parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const handleReset = () => {
    setDraft({ ...settings });
    setSlotsDraft(Object.fromEntries(rooms.map((r) => [r.id, r.totalRooms])));
    setSaveState('idle');
    setErrorMsg('');
  };

  const handleSave = async () => {
    // Validate prices
    for (const field of ROOM_FIELDS) {
      if (draft[field.key] <= 0) {
        setErrorMsg(`${field.label} price must be greater than ₱0.`);
        setSaveState('error');
        return;
      }
    }
    if (draft.key_deposit < 0) {
      setErrorMsg('Key deposit cannot be negative.');
      setSaveState('error');
      return;
    }
    // Validate slots
    for (const room of rooms) {
      if ((slotsDraft[room.id] ?? 0) < 1) {
        setErrorMsg(`${room.type} must have at least 1 slot.`);
        setSaveState('error');
        return;
      }
      if ((slotsDraft[room.id] ?? 0) < room.occupiedRooms) {
        setErrorMsg(`${room.type} slots cannot be less than current occupancy (${room.occupiedRooms}).`);
        setSaveState('error');
        return;
      }
    }
    setSaveState('saving');
    setErrorMsg('');
    try {
      const saves: Promise<any>[] = [onSaveSettings(draft)];
      if (isSlotsDirty) {
        rooms.forEach((r) => saves.push(onSaveRoomSlots(r.id, slotsDraft[r.id])));
      }
      await Promise.all(saves);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3500);
    } catch {
      setSaveState('error');
      setErrorMsg('Failed to save. Please try again.');
    }
  };

  return (
    <div className="space-y-7 pt-16 lg:pt-0">

      {/* ── HEADER ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b-2 border-slate-200 dark:border-[#1e2a3a] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white font-display">
            Admin Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1.5 font-medium leading-relaxed">
            Manage room prices and key deposit — changes apply immediately to new bookings
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {isDirty && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border-2 border-slate-300 dark:border-slate-600 text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:border-slate-400 dark:hover:border-slate-500 transition-all duration-150"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </motion.button>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving' || !isDirty}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all duration-150 ${
              !isDirty
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed opacity-60'
                : saveState === 'saving'
                ? 'bg-cyan-400 dark:bg-cyan-500 cursor-wait'
                : 'bg-cyan-500 hover:bg-cyan-600 shadow-lg shadow-cyan-500/30 dark:shadow-cyan-500/20 active:scale-[0.98]'
            }`}
          >
            {saveState === 'saving' ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving…</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {/* ── SUCCESS / ERROR TOAST ───────────────────────────────── */}
      <AnimatePresence>
        {saveState === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-5 py-3.5 bg-emerald-50 dark:bg-emerald-950/40 border-2 border-emerald-200 dark:border-emerald-800/60 rounded-2xl text-emerald-700 dark:text-emerald-300 text-sm font-semibold shadow-sm"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            Settings saved successfully! Prices and room slots have been updated.
          </motion.div>
        )}
        {saveState === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-3 px-5 py-3.5 bg-rose-50 dark:bg-rose-950/40 border-2 border-rose-200 dark:border-rose-800/60 rounded-2xl text-rose-700 dark:text-rose-300 text-sm font-semibold shadow-sm"
          >
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ROOM PRICES SECTION ─────────────────────────────────── */}
      <div className={`bg-white dark:bg-[#111827] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isEditingPrices
          ? 'border-cyan-400 dark:border-cyan-600 shadow-xl shadow-cyan-500/10 dark:shadow-cyan-500/5'
          : 'border-slate-300 dark:border-slate-700 shadow-sm'
      }`}>
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setIsEditingPrices((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-5 text-left group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-150"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-all duration-200 ${
              isEditingPrices
                ? 'bg-cyan-100 dark:bg-cyan-950/60 shadow-sm shadow-cyan-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80'
            }`}>
              <Bed className={`w-4 h-4 transition-colors ${
                isEditingPrices ? 'text-cyan-600 dark:text-cyan-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Room Prices</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {isEditingPrices
                  ? 'Edit prices per room type below'
                  : ROOM_FIELDS.map((f) => `${f.label}: ₱${settings[f.key].toLocaleString()}`).join('  ·  ')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {ROOM_FIELDS.some((f) => draft[f.key] !== settings[f.key]) && (
              <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 px-2 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-700">
                Unsaved changes
              </span>
            )}
            <motion.div animate={{ rotate: isEditingPrices ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </button>

        {/* Accordion body */}
        <AnimatePresence initial={false}>
          {isEditingPrices && (
            <motion.div
              key="prices-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700/80 pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ROOM_FIELDS.map((field) => {
                    const changed = draft[field.key] !== settings[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`bg-slate-50 dark:bg-[#0d1117] rounded-xl border-2 p-4 transition-all duration-200 ${
                          changed
                            ? 'border-cyan-400 dark:border-cyan-600 shadow-md shadow-cyan-500/10'
                            : 'border-slate-200 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">{field.label}</p>
                              {changed && (
                                <span className="text-[9px] font-bold text-cyan-700 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950/60 px-1.5 py-0.5 rounded-full border border-cyan-300 dark:border-cyan-700">
                                  Modified
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{field.desc}</p>
                          </div>
                          {changed && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0 ml-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              was ₱{settings[field.key].toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none select-none">₱</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={draft[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 text-sm font-bold bg-white dark:bg-[#151c27] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 rounded-xl text-gray-800 dark:text-gray-100 transition-all placeholder:text-gray-400"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">
                          2 nights = <span className="font-bold text-gray-700 dark:text-gray-300">₱{(draft[field.key] * 2).toLocaleString()}</span>
                          &nbsp;·&nbsp;
                          7 nights = <span className="font-bold text-gray-700 dark:text-gray-300">₱{(draft[field.key] * 7).toLocaleString()}</span>
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── KEY DEPOSIT SECTION ─────────────────────────────────── */}
      <div className={`bg-white dark:bg-[#111827] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isEditingDeposit
          ? 'border-amber-400 dark:border-amber-600 shadow-xl shadow-amber-500/10 dark:shadow-amber-500/5'
          : 'border-slate-300 dark:border-slate-700 shadow-sm'
      }`}>
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setIsEditingDeposit((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-5 text-left group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-150"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-all duration-200 ${
              isEditingDeposit
                ? 'bg-amber-100 dark:bg-amber-950/60 shadow-sm shadow-amber-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80'
            }`}>
              <Key className={`w-4 h-4 transition-colors ${
                isEditingDeposit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Key Deposit</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {isEditingDeposit
                  ? 'Edit the refundable key deposit amount below'
                  : `Current deposit: ₱${settings.key_deposit.toLocaleString()} — refundable on check-out`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {draft.key_deposit !== settings.key_deposit && (
              <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                Unsaved changes
              </span>
            )}
            <motion.div animate={{ rotate: isEditingDeposit ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </button>

        {/* Accordion body */}
        <AnimatePresence initial={false}>
          {isEditingDeposit && (
            <motion.div
              key="deposit-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700/80 pt-5 max-w-sm">
                <div className="flex items-start justify-between mb-3.5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">Key Deposit (refundable)</p>
                      {draft.key_deposit !== settings.key_deposit && (
                        <span className="text-[9px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                          Modified
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                      Added to every booking — returned to border on check-out
                    </p>
                  </div>
                  {draft.key_deposit !== settings.key_deposit && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0 ml-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                      was ₱{settings.key_deposit.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none select-none">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.key_deposit}
                    onChange={(e) => handleChange('key_deposit', e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm font-bold bg-white dark:bg-[#151c27] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-amber-500 dark:focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 rounded-xl text-gray-800 dark:text-gray-100 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>



      {/* ── ROOM SLOTS SECTION ──────────────────────────────── */}
      <div className={`bg-white dark:bg-[#111827] rounded-2xl border-2 transition-all duration-200 overflow-hidden ${
        isEditingSlots
          ? 'border-violet-400 dark:border-violet-600 shadow-xl shadow-violet-500/10 dark:shadow-violet-500/5'
          : 'border-slate-300 dark:border-slate-700 shadow-sm'
      }`}>
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setIsEditingSlots((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-5 text-left group hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors duration-150"
        >
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-xl transition-all duration-200 ${
              isEditingSlots
                ? 'bg-violet-100 dark:bg-violet-950/60 shadow-sm shadow-violet-500/20'
                : 'bg-slate-100 dark:bg-slate-800/80'
            }`}>
              <Hash className={`w-4 h-4 transition-colors ${
                isEditingSlots ? 'text-violet-600 dark:text-violet-400' : 'text-gray-500 dark:text-gray-400'
              }`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white tracking-tight">Room Slots</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">
                {isEditingSlots
                  ? 'Edit total available slots per room type below'
                  : rooms.map((r) => `${r.type}: ${r.totalRooms}`).join('  ·  ')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 ml-3">
            {isSlotsDirty && (
              <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 px-2 py-0.5 rounded-full border border-violet-300 dark:border-violet-700">
                Unsaved changes
              </span>
            )}
            <motion.div animate={{ rotate: isEditingSlots ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <svg className="w-4 h-4 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </motion.div>
          </div>
        </button>

        {/* Accordion body */}
        <AnimatePresence initial={false}>
          {isEditingSlots && (
            <motion.div
              key="slots-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              style={{ overflow: 'hidden' }}
            >
              <div className="px-6 pb-6 border-t-2 border-slate-200 dark:border-slate-700/80 pt-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rooms.map((room) => {
                    const draftVal = slotsDraft[room.id] ?? room.totalRooms;
                    const changed  = draftVal !== room.totalRooms;
                    const tooLow   = draftVal < room.occupiedRooms;
                    return (
                      <div
                        key={room.id}
                        className={`bg-slate-50 dark:bg-[#0d1117] rounded-xl border-2 p-4 transition-all duration-200 ${
                          tooLow
                            ? 'border-rose-400 dark:border-rose-600 shadow-md shadow-rose-500/10'
                            : changed
                            ? 'border-violet-400 dark:border-violet-600 shadow-md shadow-violet-500/10'
                            : 'border-slate-200 dark:border-slate-700/70 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        {/* Card header */}
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-xs font-bold text-gray-900 dark:text-white tracking-tight">{room.type}</p>
                              {changed && !tooLow && (
                                <span className="text-[9px] font-bold text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-950/60 px-1.5 py-0.5 rounded-full border border-violet-300 dark:border-violet-700">
                                  Modified
                                </span>
                              )}
                              {tooLow && (
                                <span className="text-[9px] font-bold text-rose-700 dark:text-rose-300 bg-rose-100 dark:bg-rose-950/60 px-1.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-700">
                                  Below occupancy
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 font-medium">{room.name}</p>
                          </div>
                          {changed && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0 ml-2 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded-md">
                              was {room.totalRooms}
                            </p>
                          )}
                        </div>

                        {/* Input */}
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={draftVal}
                          onChange={(e) => handleSlotChange(room.id, e.target.value)}
                          className={`w-full px-4 py-2.5 text-sm font-bold border-2 focus:outline-none focus:ring-2 rounded-xl text-gray-800 dark:text-gray-100 transition-all bg-white dark:bg-[#151c27] ${
                            tooLow
                              ? 'border-rose-400 dark:border-rose-600 focus:border-rose-500 focus:ring-rose-500/20'
                              : 'border-slate-300 dark:border-slate-600 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-violet-500/20'
                          }`}
                        />

                        {/* Occupancy bar */}
                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] font-semibold">
                            <span className="text-gray-400 dark:text-gray-500">
                              Occupied: <span className="text-gray-700 dark:text-gray-300 font-bold">{room.occupiedRooms}</span>
                            </span>
                            <span className="text-gray-400 dark:text-gray-500">
                              Available: <span className={`font-bold ${tooLow ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                {Math.max(0, draftVal - room.occupiedRooms)}
                              </span>
                            </span>
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-slate-200 dark:bg-slate-700/60 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${tooLow ? 'bg-rose-500' : 'bg-violet-500'}`}
                              style={{ width: `${draftVal > 0 ? Math.min(100, (room.occupiedRooms / draftVal) * 100) : 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>


              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── INFO NOTE ───────────────────────────────────────────── */}
      <div className="flex items-start gap-3.5 p-4 bg-blue-50 dark:bg-blue-950/30 border-2 border-blue-100 dark:border-blue-900/50 rounded-2xl shadow-sm">
        <Settings className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
          Changes saved here update the prices in Supabase instantly. All <strong className="font-bold text-blue-800 dark:text-blue-200">new bookings</strong> created after saving will use the updated rates. Existing bookings are not affected.
        </p>
      </div>
    </div>
  );
}