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
        <div className="flex flex-col items-center space-y-2 mt-2">
          <div className="relative group cursor-pointer">
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="relative w-16 h-16 bg-black rounded-full overflow-hidden border-2 border-white/20 flex items-center justify-center">
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
          <div className="text-center">
            <span className="font-display font-black text-xs tracking-wider text-gray-800 dark:text-gray-100 uppercase block">
              AK Seafarers
            </span>
            <span className="text-[9px] tracking-widest text-gray-500 dark:text-[#a0aec0] uppercase font-semibold">
              & Transient Homes
            </span>
          </div>
        </div>

        {/* NAV */}
        <nav className="flex flex-col space-y-2 pt-4">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group text-left w-full relative ${
                  isActive
                    ? 'bg-white dark:bg-[#1a2333] text-gray-900 dark:text-white shadow-sm border border-slate-200 dark:border-slate-800/85'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-white/70 dark:hover:bg-slate-800/30'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute left-2 w-1.5 h-6 bg-cyan-500 dark:bg-cyan-400 rounded-full"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <IconComponent
                  className={`w-5 h-5 mr-3 transition-transform duration-200 group-hover:scale-105 ${
                    isActive ? 'text-cyan-500 dark:text-cyan-400' : 'text-gray-400 group-hover:text-cyan-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="flex flex-col space-y-4 pt-4 border-t border-slate-200 dark:border-[#212936]">
        <button
          onClick={onToggleDark}
          className="flex items-center justify-between px-4 py-2.5 text-xs font-semibold rounded-xl bg-slate-100 dark:bg-slate-800/40 text-gray-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700/40"
        >
          <span className="flex items-center space-x-2">
            {isDark ? (
              <><Sun className="w-4 h-4 text-amber-500" /><span>Light Mode</span></>
            ) : (
              <><Moon className="w-4 h-4 text-indigo-500" /><span>Dark Mode</span></>
            )}
          </span>
          <span className="w-5 h-5 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[9px] shadow-sm font-bold text-gray-600 dark:text-gray-300">
            {isDark ? 'L' : 'D'}
          </span>
        </button>

        <button
          onClick={() => { setShowPasswordModal(true); setPwError(''); setPwSuccess(false); }}
          className="flex items-center space-x-3 p-2.5 bg-white/60 dark:bg-slate-800/10 rounded-xl border border-slate-200 dark:border-slate-700/20 w-full text-left hover:bg-white dark:hover:bg-slate-800/30 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs shadow-inner shrink-0">
            {adminName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{adminName}</p>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium capitalize">
              {userRole === 'superadmin' ? 'Super Admin' : 'Administrator'}
            </p>
          </div>
          <KeyRound className="w-3.5 h-3.5 text-gray-400 group-hover:text-cyan-500 transition-colors shrink-0" />
        </button>

        <button
          onClick={onLogout}
          className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 group text-left w-full"
        >
          <LogOut className="w-5 h-5 mr-3 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
          <span>Log out</span>
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* MOBILE HAMBURGER */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-white dark:bg-[#1a2333] rounded-xl shadow-md border border-slate-200 dark:border-slate-700 text-gray-700 dark:text-gray-200"
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
              className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
            <motion.div
              initial={{opacity:0, scale:0.95, y:10}} animate={{opacity:1, scale:1, y:0}}
              exit={{opacity:0, scale:0.95, y:10}}
              transition={{type:'spring', damping:25, stiffness:280}}
              className="relative w-full max-w-sm bg-white dark:bg-[#121822] rounded-2xl shadow-2xl border-2 border-slate-300 dark:border-slate-600 overflow-hidden"
            >
              {/* Header */}
              <div className="p-5 border-b-2 border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-[#0e141d]">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-cyan-500" />
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white font-display uppercase tracking-wider">Change Password</h2>
                </div>
                <button onClick={() => setShowPasswordModal(false)}
                  className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-5 space-y-4">
                {pwSuccess ? (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500" />
                    <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Password changed successfully!</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                        {adminName.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{adminName}</p>
                        <p className="text-[10px] text-cyan-600 dark:text-cyan-400 capitalize">{userRole === 'superadmin' ? 'Super Admin' : 'Administrator'}</p>
                      </div>
                    </div>

                    {/* New password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">New Password</label>
                      <div className="relative">
                        <input
                          type={showNew ? 'text' : 'password'}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                        />
                        <button type="button" onClick={() => setShowNew(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confirm Password</label>
                      <div className="relative">
                        <input
                          type={showConfirm ? 'text' : 'password'}
                          placeholder="Confirm new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                          className="w-full px-4 py-2.5 pr-10 text-sm bg-gray-50 dark:bg-[#0f141c] border-2 border-slate-300 dark:border-slate-600 focus:outline-none focus:border-cyan-500 dark:focus:border-cyan-400 rounded-xl text-gray-800 dark:text-gray-200 font-semibold"
                        />
                        <button type="button" onClick={() => setShowConfirm(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                          {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {pwError && (
                      <p className="text-xs text-rose-500 font-semibold flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />{pwError}
                      </p>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button onClick={() => setShowPasswordModal(false)}
                        className="py-2.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition-colors">
                        Cancel
                      </button>
                      <button onClick={handlePasswordSubmit} disabled={pwLoading}
                        className="py-2.5 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-60 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5">
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