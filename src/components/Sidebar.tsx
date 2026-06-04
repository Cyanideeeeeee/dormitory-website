import { LayoutDashboard, CalendarDays, LogOut, Moon, Sun } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'dashboard' | 'booking';
  onChangeTab: (tab: 'dashboard' | 'booking') => void;
  isDark: boolean;
  onToggleDark: () => void;
  onLogout: () => void;
  adminName: string;
}

export default function Sidebar({
  activeTab,
  onChangeTab,
  isDark,
  onToggleDark,
  onLogout,
  adminName,
}: SidebarProps) {
  // Built-in path to the generated neon logo
  const logoPath = '/src/assets/images/ak_seafarers_logo_1780495377476.png';

  const menuItems = [
    {
      id: 'dashboard' as const,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'booking' as const,
      label: 'Booking',
      icon: CalendarDays,
    },
  ];

  return (
    <aside className="w-64 bg-[#f1f3f6] dark:bg-[#0f141c] border-r border-[#e1e5eb] dark:border-[#212936] flex flex-col justify-between py-6 px-4 h-screen fixed top-0 left-0 transition-colors duration-300">
      <div className="flex flex-col space-y-8">
        {/* LOGO AREA - Circular high-contrast neon design matching style reference */}
        <div className="flex flex-col items-center space-y-2 mt-2">
          <div className="relative group cursor-pointer">
            {/* Glowing Ring Backdrop */}
            <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-400 to-pink-500 rounded-full blur-md opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            
            <div className="relative w-18 h-18 bg-black rounded-full overflow-hidden border-2 border-white/20 flex items-center justify-center">
              <img
                src={logoPath}
                alt="AK Seafarers Logo"
                className="w-full h-full object-cover select-none"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback beautiful inline SVG logo if image load fails
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = document.createElement('div');
                    fallback.className = 'w-full h-full flex flex-col items-center justify-center bg-slate-900 text-[9px] font-bold text-center text-neon-cyan leading-none p-1';
                    fallback.innerHTML = `
                      <span class="text-neon-pink font-display font-black text-[11px] tracking-wide relative">AK</span>
                      <span class="text-[7px] text-cyan-300 tracking-tighter uppercase">SEAFARERS</span>
                      <div class="w-4 h-[1px] bg-pink-500 my-[2px]"></div>
                      <span class="text-[6px] text-gray-400 uppercase">TRANSIT</span>
                    `;
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
            <span className="text-[9px] tracking-widest text-[#6c7686] dark:text-[#a0aec0] uppercase font-semibold">
              & Transient Homes
            </span>
          </div>
        </div>

        {/* NAVIGATION LINKS */}
        <nav className="flex flex-col space-y-2 pt-4">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => onChangeTab(item.id)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 group text-left w-full relative ${
                  isActive
                    ? 'bg-white dark:bg-[#1a2333] text-gray-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-800/85'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-950 dark:hover:text-white hover:bg-white/50 dark:hover:bg-slate-800/30'
                }`}
              >
                {/* Active Accent Indicator */}
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

      {/* BOTTOM SECTION */}
      <div className="flex flex-col space-y-4 pt-4 border-t border-[#e1e5eb] dark:border-[#212936]">
        {/* Toggle Dark Mode Button in Sidebar */}
        <button
          id="btn-toggle-darkmode"
          onClick={onToggleDark}
          className="flex items-center justify-between px-4 py-2 text-xs font-semibold rounded-lg bg-gray-200/40 dark:bg-slate-800/40 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-800 transition-colors"
        >
          <span className="flex items-center space-x-2">
            {isDark ? (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-indigo-500" />
                <span>Dark Mode</span>
              </>
            )}
          </span>
          <span className="w-5 h-5 rounded bg-white dark:bg-slate-700 flex items-center justify-center text-[9px] shadow-sm font-bold">
            {isDark ? 'L' : 'D'}
          </span>
        </button>

        {/* Current Active User Profile Segment */}
        <div className="flex items-center space-x-3 p-2 bg-white/40 dark:bg-slate-800/10 rounded-xl border border-slate-200/20">
          <div className="w-8 h-8 rounded-full bg-cyan-600 flex items-center justify-center text-white font-bold text-xs shadow-inner">
            {adminName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{adminName}</p>
            <p className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium">Administrator</p>
          </div>
        </div>

        {/* LOGOUT BUTTON - Styled exactly like the image */}
        <button
          id="sidebar-btn-logout"
          onClick={onLogout}
          className="flex items-center px-4 py-3 rounded-xl text-sm font-semibold text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all duration-200 group text-left w-full"
        >
          <LogOut className="w-5 h-5 mr-3 text-rose-500 group-hover:translate-x-0.5 transition-transform" />
          <span>Log out</span>
        </button>
      </div>
    </aside>
  );
}