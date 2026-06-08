import { useState } from 'react';
import { Settings, Save, RefreshCw, Bed, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

const ROOM_FIELDS: { key: keyof PriceSettings; label: string; desc: string; icon: string }[] = [
  { key: 'price_bed_space',   label: 'Bed Space',   desc: 'Price per night for a shared bed space',        icon: '' },
  { key: 'price_solo_room',   label: 'Solo Room',   desc: 'Price per night for a single occupancy room',   icon: '' },
  { key: 'price_couple_room', label: 'Couple Room', desc: 'Price per night for a couple/double room',      icon: '' },
  { key: 'price_family_room', label: 'Family Room', desc: 'Price per night for a family room (2–3 pax)',   icon: '' },
];

type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function AdminView({ settings, onSaveSettings }: AdminViewProps) {
  // Local editable copy of settings
  const [draft, setDraft] = useState<PriceSettings>({ ...settings });
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  // Accordion open/close state — collapsed by default
  const [isEditingPrices,  setIsEditingPrices]  = useState(false);
  const [isEditingDeposit, setIsEditingDeposit] = useState(false);

  // Keep draft in sync if parent settings change (e.g. after re-fetch)
  // Only reset if not currently editing
  const isDirty = Object.keys(draft).some(
    (k) => draft[k as keyof PriceSettings] !== settings[k as keyof PriceSettings]
  );

  const handleChange = (key: keyof PriceSettings, raw: string) => {
    const val = parseFloat(raw);
    setDraft((prev) => ({ ...prev, [key]: isNaN(val) ? 0 : val }));
  };

  const handleReset = () => {
    setDraft({ ...settings });
    setSaveState('idle');
    setErrorMsg('');
  };

  const handleSave = async () => {
    // Validate — no negative or zero prices
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

    setSaveState('saving');
    setErrorMsg('');

    try {
      await onSaveSettings(draft);
      setSaveState('success');
      setTimeout(() => setSaveState('idle'), 3000);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Failed to save. Please try again.');
      setSaveState('error');
    }
  };

  return (
    <div className="space-y-6 pt-16 lg:pt-0">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-[#212936] pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 dark:text-white font-display">
            Admin Settings
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-semibold">
            Manage room prices and key deposit — changes apply immediately to new bookings
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {isDirty && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={saveState === 'saving' || !isDirty}
            className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all ${
              !isDirty
                ? 'bg-slate-300 dark:bg-slate-700 cursor-not-allowed'
                : saveState === 'saving'
                ? 'bg-cyan-400 cursor-wait'
                : 'bg-cyan-500 hover:bg-cyan-600 shadow-md shadow-cyan-500/20'
            }`}
          >
            {saveState === 'saving' ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...</>
            ) : (
              <><Save className="w-3.5 h-3.5" /> Save Changes</>
            )}
          </button>
        </div>
      </div>

      {/* SUCCESS / ERROR TOAST */}
      <AnimatePresence>
        {saveState === 'success' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-700 dark:text-emerald-400 text-sm font-semibold"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Prices updated successfully! New bookings will use the updated rates.
          </motion.div>
        )}
        {saveState === 'error' && errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2.5 px-4 py-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 rounded-xl text-rose-700 dark:text-rose-400 text-sm font-semibold"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ROOM PRICES SECTION — collapsible */}
      <div className={`bg-white dark:bg-[#151c27] rounded-2xl border-2 transition-all overflow-hidden ${
        isEditingPrices
          ? 'border-cyan-400 dark:border-cyan-600 shadow-md shadow-cyan-500/10'
          : 'border-slate-300 dark:border-slate-600'
      }`}>
        {/* Accordion header — always visible */}
        <button
          type="button"
          onClick={() => setIsEditingPrices((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${isEditingPrices ? 'bg-cyan-100 dark:bg-cyan-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Bed className={`w-4 h-4 transition-colors ${isEditingPrices ? 'text-cyan-500' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Room Prices</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {isEditingPrices
                  ? 'Edit prices per room type below'
                  : ROOM_FIELDS.map((f) => `${f.label}: ₱${settings[f.key].toLocaleString()}`).join('  ·  ')
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {ROOM_FIELDS.some((f) => draft[f.key] !== settings[f.key]) && (
              <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-2 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
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
              <div className="px-5 pb-5 border-t-2 border-slate-200 dark:border-slate-700 pt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {ROOM_FIELDS.map((field) => {
                    const changed = draft[field.key] !== settings[field.key];
                    return (
                      <div
                        key={field.key}
                        className={`bg-slate-50 dark:bg-[#0f141c] rounded-xl border-2 p-4 transition-all ${
                          changed
                            ? 'border-cyan-400 dark:border-cyan-600'
                            : 'border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{field.label}</p>
                              {changed && (
                                <span className="text-[9px] font-bold text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/40 px-1.5 py-0.5 rounded-full border border-cyan-200 dark:border-cyan-800">
                                  Modified
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{field.desc}</p>
                          </div>
                          {changed && (
                            <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0 ml-2">
                              was ₱{settings[field.key].toLocaleString()}
                            </p>
                          )}
                        </div>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none">₱</span>
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={draft[field.key]}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full pl-8 pr-4 py-2.5 text-sm font-bold bg-white dark:bg-[#151c27] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 rounded-xl text-gray-800 dark:text-gray-100 transition-all"
                          />
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1.5 font-medium">
                          2 nights = <span className="font-bold text-gray-600 dark:text-gray-300">₱{(draft[field.key] * 2).toLocaleString()}</span>
                          &nbsp;·&nbsp;
                          7 nights = <span className="font-bold text-gray-600 dark:text-gray-300">₱{(draft[field.key] * 7).toLocaleString()}</span>
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

      {/* KEY DEPOSIT SECTION — collapsible */}
      <div className={`bg-white dark:bg-[#151c27] rounded-2xl border-2 transition-all overflow-hidden ${
        isEditingDeposit
          ? 'border-amber-400 dark:border-amber-600 shadow-md shadow-amber-500/10'
          : 'border-slate-300 dark:border-slate-600'
      }`}>
        {/* Accordion header */}
        <button
          type="button"
          onClick={() => setIsEditingDeposit((v) => !v)}
          className="w-full flex items-center justify-between px-5 py-4 text-left group"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl transition-colors ${isEditingDeposit ? 'bg-amber-100 dark:bg-amber-950/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              <Key className={`w-4 h-4 transition-colors ${isEditingDeposit ? 'text-amber-500' : 'text-gray-500 dark:text-gray-400'}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Key Deposit</p>
              <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">
                {isEditingDeposit
                  ? 'Edit the refundable key deposit amount below'
                  : `Current deposit: ₱${settings.key_deposit.toLocaleString()} — refundable on check-out`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            {draft.key_deposit !== settings.key_deposit && (
              <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
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
              <div className="px-5 pb-5 border-t-2 border-slate-200 dark:border-slate-700 pt-4 max-w-sm">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">Key Deposit (refundable)</p>
                      {draft.key_deposit !== settings.key_deposit && (
                        <span className="text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                          Modified
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                      Added to every booking — returned to border on check-out
                    </p>
                  </div>
                  {draft.key_deposit !== settings.key_deposit && (
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono shrink-0 ml-2">
                      was ₱{settings.key_deposit.toLocaleString()}
                    </p>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-500 dark:text-gray-400 pointer-events-none">₱</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={draft.key_deposit}
                    onChange={(e) => handleChange('key_deposit', e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 text-sm font-bold bg-slate-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded-xl text-gray-800 dark:text-gray-100 transition-all"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* INFO NOTE */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl">
        <Settings className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <p className="text-xs text-blue-700 dark:text-blue-400 font-medium leading-relaxed">
          Changes saved here update the prices in Supabase instantly. All <strong>new bookings</strong> created after saving will use the updated rates. Existing bookings are not affected.
        </p>
      </div>
    </div>
  );
}