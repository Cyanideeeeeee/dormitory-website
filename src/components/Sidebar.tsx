import { useState } from 'react';
import { LayoutDashboard, CalendarDays, LogOut, Moon, Sun, Menu, X, CalendarRange, Settings, KeyRound, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { AppRole } from '../types';
import logoV2 from '../assets/images/logo-v2.png';

interface SidebarProps {
  activeTab: 'dashboard' | 'booking' | 'calendar' | 'admin';
  onChangeTab: (tab: 'dashboard' | 'booking' | 'calendar' | 'admin') => void;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  adminName: string;
  userRole: AppRole;
  onChangePassword: (newPassword: string) => Promise<{ error?: string }>;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  isDark,
  onToggleDark,
  onLogout,
  adminName,
  userRole,
  onChangePassword,
}: SidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const logoPath = logoV2;

  const handleNav = (tab: 'dashboard' | 'booking' | 'calendar' | 'admin') => {
    onChangeTab(tab);
    setMobileOpen(false);
  };

  const handlePasswordSubmit = async () => {
    setPwError('');
    if (newPassword.length < 6) { setPwError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setPwError('Passwords do not match.'); return; }
    setPwLoading(true);
    const result = await onChangePassword(newPassword);
    setPwLoading(false);
    if (result?.error) { setPwError(result.error); return; }
    setPwSuccess(true);
    setTimeout(() => {
      setPwSuccess(false);
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
    }, 2000);
  };

  const menuItems = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'booking'   as const, label: 'Booking',   icon: CalendarDays },
    { id: 'calendar'  as const, label: 'Calendar',  icon: CalendarRange },
    { id: 'admin'     as const, label: 'Admin',      icon: Settings },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full justify-between py-6 px-4">
      <div className="flex flex-col space-y-8">
        {/* LOGO */}
        <div className="flex flex-col items-center space-y-3 mt-2">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-2 bg-gradient-to-br from-cyan-400 via-sky-500 to-pink-500 rounded-full blur-lg opacity-40 group-hover:opacity-70 transition duration-700" />
            <div className="relative w-[72px] h-[72px] bg-gradient-to-br from-slate-900 to-slate-800 rounded-full overflow-hidden border-[2.5px] border-white/25 shadow-xl flex items-center justify-center ring-2 ring-cyan-500/20">
              <img
                src={logoPath}
                alt="AK Seafarers Logo"
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-slate-900 text-[9px] font-bold text-center leading-none p-1';
                    fallback.innerHTML = '<span class="text-pink-400 font-black text-[11px] tracking-wide">AK</span><span class="text-[7px] text-cyan-300 tracking-tighter uppercase">SEAFARERS</span>';
                    parent.appendChild(fallback);
                  }
                }}
              />
            </div>
          </div>
          <div className="text-center space-y-0.5">
            <span className="font-display font-black text-[11px] tracking-[0.18em] text-gray-900 dark:text-white uppercase block drop-shadow-sm">
              AK Seafarers
            </span>
            <span className="text-[8.5px] tracking-[0.22em] text-gray-400 dark:text-slate-500 uppercase font-semibold block">
              & Transient Homes
            </span>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex flex-col space-y-1.5 pt-2">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group text-left w-full relative ${
                  isActive
                    ? 'bg-white dark:bg-[#1c2638] text-gray-900 dark:text-white shadow-md shadow-slate-200/80 dark:shadow-slate-900/60 border border-slate-200 dark:border-slate-700/60'
                    : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-white/80 dark:hover:bg-slate-800/40 hover:shadow-sm'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-2 w-[3px] h-5 bg-gradient-to-b from-cyan-400 to-cyan-600 dark:from-cyan-400 dark:to-cyan-500 rounded-full shadow-sm shadow-cyan-500/50"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <IconComponent
                  className={`w-[18px] h-[18px] mr-3 transition-all duration-200 group-hover:scale-105 shrink-0 ${
                    isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-400 dark:text-slate-500 group-hover:text-cyan-500 dark:group-hover:text-cyan-400'
                  }`}
                />
                <span className={`truncate text-[13px] tracking-wide ${isActive ? 'font-bold' : 'font-semibold'}`}>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="flex flex-col space-y-3 pt-4 border-t border-slate-200/80 dark:border-slate-800">
        <button
          onClick={onToggleDark}
          className="flex items-center justify-between px-3.5 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800/50 text-gray-700 dark:text-gray-300 hover:bg-slate-200/80 dark:hover:bg-slate-700/60 transition-all duration-200 border border-slate-200/80 dark:border-slate-700/40 group"
        >
          <span className="flex items-center space-x-2.5">
            {isDark ? (
              <><Sun className="w-4 h-4 text-amber-400 group-hover:text-amber-300 transition-colors" /><span className="text-[12px] tracking-wide">Light Mode</span></>
            ) : (
              <><Moon className="w-4 h-4 text-indigo-500 group-hover:text-indigo-400 transition-colors" /><span className="text-[12px] tracking-wide">Dark Mode</span></>
            )}
          </span>
          <span className="w-5 h-5 rounded-md bg-white dark:bg-slate-700 flex items-center justify-center text-[9px] shadow-sm font-black text-gray-500 dark:text-gray-300 border border-slate-200 dark:border-slate-600">
            {isDark ? 'L' : 'D'}
          </span>
        </button>

        <button
          onClick={() => { setShowPasswordModal(true); setPwError(''); setPwSuccess(false); }}
          className="flex items-center space-x-3 p-2.5 bg-white/80 dark:bg-slate-800/20 rounded-xl border border-slate-200/80 dark:border-slate-700/30 w-full text-left hover:bg-white dark:hover:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600/50 hover:shadow-sm transition-all duration-200 group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black text-xs shadow-md shadow-cyan-900/30 shrink-0 ring-2 ring-cyan-500/20">
            {adminName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100 truncate tracking-wide">{adminName}</p>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold capitalize tracking-wide">
              {userRole === 'superadmin' ? 'Super Admin' : 'Administrator'}
            </p>
          </div>
          <KeyRound className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600 group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors shrink-0" />
        </button>

        <button
          onClick={onLogout}
          className="flex items-center px-4 py-2.5 rounded-xl text-[13px] font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-300 transition-all duration-200 group text-left w-full border border-transparent hover:border-rose-100 dark:hover:border-rose-900/40"
        >
          <LogOut className="w-[17px] h-[17px] mr-3 text-rose-400 group-hover:text-rose-500 dark:group-hover:text-rose-300 group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
          <span className="tracking-wide">Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE HAMBURGER */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-[#1c2638] rounded-xl shadow-lg shadow-slate-200/60 dark:shadow-slate-900/50 border border-slate-200/80 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 260 }}
              className="lg:hidden fixed top-0 left-0 z-50 w-72 h-screen bg-[#f1f3f6] dark:bg-[#0f141c] border-r border-slate-200 dark:border-[#212936] shadow-2xl overflow-y-auto"
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* DESKTOP SIDEBAR */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#f1f3f6] dark:bg-[#0f141c] border-r border-slate-200 dark:border-[#212936] h-screen fixed top-0 left-0 transition-colors duration-300 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              onClick={() => setShowPasswordModal(false)}
              className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
            <motion.div
              initial={{opacity:0, scale:0.96, y:12}} animate={{opacity:1, scale:1, y:0}}
              exit={{opacity:0, scale:0.96, y:12}}
              transition={{type:'spring', damping:26, stiffness:300}}
              className="relative w-full max-w-sm bg-white dark:bg-[#131921] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden"
            >
              {/* Gradient accent top bar */}
              <div className="absolute top-0 left-0 right-0 h-[2.5px] bg-gradient-to-r from-cyan-400 via-sky-500 to-violet-500 rounded-t-2xl" />

              {/* Header */}
              <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/10 dark:bg-cyan-500/15 flex items-center justify-center">
                    <KeyRound className="w-4 h-4 text-cyan-500" />
                  </div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white tracking-wide">Change Password</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {pwSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </div>
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tracking-wide">Password updated successfully!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center text-white font-black text-xs shadow-sm shrink-0">
                        {adminName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-[12px] font-bold text-gray-800 dark:text-gray-100 tracking-wide">{adminName}</p>
                        <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold capitalize tracking-wide">{userRole === 'superadmin' ? 'Super Admin' : 'Administrator'}</p>
                      </div>
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-[0.12em]">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 text-sm bg-white dark:bg-[#0f141c] border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20 rounded-xl text-gray-800 dark:text-gray-100 font-semibold placeholder:text-gray-300 dark:placeholder:text-slate-600 transition-all"
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-[0.12em]">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                          className="w-full px-4 py-2.5 pr-10 text-sm bg-white dark:bg-[#0f141c] border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 dark:focus:border-cyan-400 dark:focus:ring-cyan-400/20 rounded-xl text-gray-800 dark:text-gray-100 font-semibold placeholder:text-gray-300 dark:placeholder:text-slate-600 transition-all"
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pwError && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-rose-50 dark:bg-rose-950/30 rounded-lg border border-rose-100 dark:border-rose-900/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">{pwError}</p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button onClick={() => setShowPasswordModal(false)}
                        className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold transition-all tracking-wide border border-slate-200 dark:border-slate-700">
                        Cancel
                      </button>
                      <button onClick={handlePasswordSubmit} disabled={pwLoading}
                        className="py-2.5 bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-400 hover:to-cyan-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all tracking-wide shadow-md shadow-cyan-500/25 flex items-center justify-center gap-1.5">
                        {pwLoading ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                          </svg>
                        ) : <KeyRound className="w-3.5 h-3.5" />}
                        {pwLoading ? 'Saving…' : 'Update Password'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}