import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, User, Compass, LayoutGrid, Settings, LogOut, ShieldCheck, PlayCircle, ShoppingBag, Wallet, Flag, Users, ChevronDown, BadgeCheck, Sun, Moon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  admin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ admin }) => {
  const { profile, isAdmin, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { icon: LayoutGrid, label: 'Feed', path: '/feed' },
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: PlayCircle, label: 'Reels', path: '/reels' },
    { icon: Heart, label: 'Matches', path: '/matches' },
    { icon: MessageCircle, label: 'Messages', path: '/messages' },
    { icon: Flag, label: 'Pages', path: '/pages' },
    { icon: Users, label: 'Groups', path: '/groups' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  const topMenuBranches = [
    { label: 'Dating', path: '/discover', icon: Compass },
    { label: 'Reels', path: '/reels', icon: PlayCircle },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-app)] flex flex-col transition-colors duration-300">
      {/* Top Header Menu */}
      <header className="bg-[var(--bg-header)] border-b border-[var(--border-color)] px-6 py-4 sticky top-0 z-50 flex items-center justify-between transition-colors duration-300">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-[#ff3366] rounded-xl flex items-center justify-center shadow-lg shadow-[#ff3366]/20">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-xl font-black text-[var(--text-primary)] tracking-tighter uppercase">HEART CONNECT</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2 bg-[var(--bg-input)] p-1 rounded-2xl transition-colors duration-300">
          {topMenuBranches.map((branch) => (
            <Link
              key={branch.path}
              to={branch.path}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                location.pathname === branch.path 
                  ? "bg-[var(--bg-card)] text-[#ff3366] shadow-sm" 
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              )}
            >
              {branch.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 relative">
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl bg-[var(--bg-input)] text-[var(--text-secondary)] hover:text-[#ff3366] transition-all border border-[var(--border-color)]"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          <div className="relative flex items-center" ref={dropdownRef}>
            {profile && (
              <>
                <button 
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center gap-3 bg-[var(--bg-input)] px-3 py-1.5 rounded-2xl border border-[var(--border-color)] hover:bg-[var(--bg-card)] transition-all group"
                >
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-[var(--text-primary)]">{profile.name}</p>
                    <p className="text-[10px] font-bold text-[#ff3366] uppercase tracking-wider">{profile.level} • {profile.points} pts</p>
                  </div>
                  <div className="relative">
                    <img 
                      src={profile.photos?.[0] || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                      className="w-8 h-8 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute -bottom-1 -right-1 bg-[var(--bg-card)] rounded-full p-0.5 shadow-sm border border-[var(--border-color)]">
                      <ChevronDown className={cn("w-2.5 h-2.5 text-[var(--text-secondary)] transition-transform", isProfileOpen && "rotate-180")} />
                    </div>
                  </div>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                      className="absolute top-full right-0 mt-2 w-72 bg-[var(--bg-card)] rounded-[2rem] shadow-2xl border border-[var(--border-color)] p-4 z-[60]"
                    >
                      <div className="flex items-center gap-3 p-3 bg-[var(--bg-input)] rounded-2xl mb-4">
                        <img 
                          src={profile.photos?.[0] || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                          className="w-12 h-12 rounded-xl object-cover border-2 border-white dark:border-slate-700 shadow-sm"
                          referrerPolicy="no-referrer"
                        />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-[var(--text-primary)]">{profile.name}</p>
                            {profile.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest truncate max-w-[150px]">{profile.email}</p>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Link 
                          to="/profile" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-all font-bold text-sm group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center group-hover:bg-blue-100 dark:group-hover:bg-blue-900/50 transition-colors">
                            <User className="w-4 h-4 text-blue-500" />
                          </div>
                          <span className="text-[var(--text-primary)]">See your profile</span>
                        </Link>
                        
                        <Link 
                          to="/settings" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-all font-bold text-sm group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center group-hover:bg-slate-200 dark:group-hover:bg-slate-600 transition-colors">
                            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          </div>
                          <span className="text-[var(--text-primary)]">Settings & Privacy</span>
                        </Link>

                        {isAdmin && (
                          <Link 
                            to="/admin" 
                            onClick={() => setIsProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-all font-bold text-sm group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center group-hover:bg-purple-100 dark:group-hover:bg-purple-900/50 transition-colors">
                              <ShieldCheck className="w-4 h-4 text-purple-500" />
                            </div>
                            <span className="text-[var(--text-primary)]">Admin Dashboard</span>
                          </Link>
                        )}

                        <div className="h-px bg-[var(--border-color)] my-2 mx-2" />

                        <button 
                          onClick={() => {
                            setIsProfileOpen(false);
                            handleLogout();
                          }}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all font-bold text-sm group w-full text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center group-hover:bg-red-100 dark:group-hover:bg-red-900/50 transition-colors">
                            <LogOut className="w-4 h-4 text-red-500" />
                          </div>
                          <span>Log Out</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Quick Menu */}
      <div className="md:hidden bg-[var(--bg-header)] border-b border-[var(--border-color)] px-4 py-3 flex gap-2 sticky top-[73px] z-40 shadow-sm transition-colors duration-300 overflow-x-auto no-scrollbar">
        {topMenuBranches.map((branch) => (
          <Link
            key={branch.path}
            to={branch.path}
            className={cn(
              "flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all border flex flex-col items-center gap-1",
              location.pathname === branch.path 
                ? "bg-[#ff3366] text-white border-[#ff3366] shadow-lg shadow-[#ff3366]/20" 
                : "bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card)]"
            )}
          >
            {branch.icon && <branch.icon className="w-4 h-4" />}
            <span>{branch.label}</span>
          </Link>
        ))}
        <button
          onClick={toggleTheme}
          className="flex-1 min-w-[80px] py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-center transition-all border flex flex-col items-center gap-1 bg-[var(--bg-input)] text-[var(--text-secondary)] border-[var(--border-color)] hover:bg-[var(--bg-card)]"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{theme === 'light' ? 'Dark' : 'Light'}</span>
        </button>
      </div>

      <div className="flex flex-1 md:flex-row">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] p-6 h-[calc(100vh-73px)] sticky top-[73px] transition-colors duration-300">
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  location.pathname === item.path
                    ? "bg-[#ff3366] text-white shadow-md shadow-[#ff3366]/20"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[#ff3366]"
                )}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-white" : "text-[var(--text-secondary)] group-hover:text-[#ff3366]")} />
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            {isAdmin && (
              <Link
                to="/admin"
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group mt-8",
                  location.pathname.startsWith('/admin')
                    ? "bg-[#6c5ce7] text-white shadow-md shadow-[#6c5ce7]/20"
                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-input)] hover:text-[#6c5ce7]"
                )}
              >
                <ShieldCheck className={cn("w-5 h-5", location.pathname.startsWith('/admin') ? "text-white" : "text-[var(--text-secondary)] group-hover:text-[#6c5ce7]")} />
                <span className="font-medium">Admin Panel</span>
              </Link>
            )}
          </nav>

          <div className="pt-6 border-t border-[var(--border-color)] space-y-2">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-[var(--text-secondary)] hover:bg-[var(--bg-input)] transition-all"
            >
              <Settings className="w-5 h-5 text-[var(--text-secondary)]" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[var(--bg-header)] border-t border-[var(--border-color)] px-4 py-2 flex justify-around items-center z-50 transition-colors duration-300">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all",
                location.pathname === item.path ? "text-[#ff3366]" : "text-[var(--text-secondary)]"
              )}
            >
              <item.icon className="w-6 h-6" />
            </Link>
          ))}
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
