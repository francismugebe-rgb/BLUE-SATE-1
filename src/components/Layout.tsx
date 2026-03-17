import React, { useState, useRef, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, User, Compass, LayoutGrid, Settings, LogOut, ShieldCheck, PlayCircle, ShoppingBag, Wallet, Flag, Users, ChevronDown, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LayoutProps {
  admin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ admin }) => {
  const { profile, isAdmin } = useAuth();
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
    await auth.signOut();
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
    { label: 'Dating', path: '/discover' },
    { label: 'Reels', path: '/reels' },
    { label: 'Chat', path: '/chat' },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6fa] flex flex-col">
      {/* Top Header Menu */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-50 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 bg-[#ff3366] rounded-xl flex items-center justify-center shadow-lg shadow-[#ff3366]/20">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">HEART CONNECT</span>
        </Link>

        <nav className="hidden md:flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
          {topMenuBranches.map((branch) => (
            <Link
              key={branch.path}
              to={branch.path}
              className={cn(
                "px-6 py-2 rounded-xl font-bold text-sm transition-all",
                location.pathname === branch.path 
                  ? "bg-white text-[#ff3366] shadow-sm" 
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {branch.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4 relative" ref={dropdownRef}>
          {profile && (
            <>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all group"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-bold text-slate-900">{profile.name}</p>
                  <p className="text-[10px] font-bold text-[#ff3366] uppercase tracking-wider">{profile.level} • {profile.points} pts</p>
                </div>
                <div className="relative">
                  <img 
                    src={profile.photos?.[0] || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                    className="w-8 h-8 rounded-xl object-cover border-2 border-white shadow-sm"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow-sm border border-slate-100">
                    <ChevronDown className={cn("w-2.5 h-2.5 text-slate-400 transition-transform", isProfileOpen && "rotate-180")} />
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
                    className="absolute top-full right-0 mt-2 w-72 bg-white rounded-[2rem] shadow-2xl border border-slate-100 p-4 z-[60]"
                  >
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl mb-4">
                      <img 
                        src={profile.photos?.[0] || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                        className="w-12 h-12 rounded-xl object-cover border-2 border-white shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <div className="flex items-center gap-1">
                          <p className="font-bold text-slate-900">{profile.name}</p>
                          {profile.isVerified && <BadgeCheck className="w-3.5 h-3.5 text-blue-500 fill-blue-500" />}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{profile.email}</p>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <Link 
                        to="/profile" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                          <User className="w-4 h-4 text-blue-500" />
                        </div>
                        <span>See your profile</span>
                      </Link>
                      
                      <Link 
                        to="/settings" 
                        onClick={() => setIsProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center group-hover:bg-slate-200 transition-colors">
                          <Settings className="w-4 h-4 text-slate-500" />
                        </div>
                        <span>Settings & Privacy</span>
                      </Link>

                      {isAdmin && (
                        <Link 
                          to="/admin" 
                          onClick={() => setIsProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-slate-50 transition-all font-bold text-sm group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 transition-colors">
                            <ShieldCheck className="w-4 h-4 text-purple-500" />
                          </div>
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      <div className="h-px bg-slate-100 my-2 mx-2" />

                      <button 
                        onClick={() => {
                          setIsProfileOpen(false);
                          handleLogout();
                        }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all font-bold text-sm group w-full text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center group-hover:bg-red-100 transition-colors">
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
      </header>

      <div className="flex flex-1 md:flex-row">
        {/* Sidebar for Desktop */}
        <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 h-[calc(100vh-73px)] sticky top-[73px]">
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                  location.pathname === item.path
                    ? "bg-[#ff3366] text-white shadow-md shadow-[#ff3366]/20"
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#ff3366]"
                )}
              >
                <item.icon className={cn("w-5 h-5", location.pathname === item.path ? "text-white" : "text-slate-400 group-hover:text-[#ff3366]")} />
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
                    : "text-slate-500 hover:bg-slate-50 hover:text-[#6c5ce7]"
                )}
              >
                <ShieldCheck className={cn("w-5 h-5", location.pathname.startsWith('/admin') ? "text-white" : "text-slate-400 group-hover:text-[#6c5ce7]")} />
                <span className="font-medium">Admin Panel</span>
              </Link>
            )}
          </nav>

          <div className="pt-6 border-t border-slate-100 space-y-2">
            <Link
              to="/settings"
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:bg-slate-50 transition-all"
            >
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-500 hover:bg-red-50 transition-all w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </aside>

        {/* Mobile Bottom Nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-50">
          {navItems.slice(0, 5).map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex flex-col items-center p-2 rounded-lg transition-all",
                location.pathname === item.path ? "text-[#ff3366]" : "text-slate-400"
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
