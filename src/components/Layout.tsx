import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, User, Compass, LayoutGrid, Settings, LogOut, ShieldCheck, PlayCircle, ShoppingBag } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { cn } from '../lib/utils';

interface LayoutProps {
  admin?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ admin }) => {
  const { profile, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/');
  };

  const navItems = [
    { icon: Compass, label: 'Discover', path: '/discover' },
    { icon: LayoutGrid, label: 'Feed', path: '/feed' },
    { icon: PlayCircle, label: 'Reels', path: '/reels' },
    { icon: ShoppingBag, label: 'Market', path: '/market' },
    { icon: Heart, label: 'Matches', path: '/matches' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
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
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-[#ff3366] rounded-xl flex items-center justify-center shadow-lg shadow-[#ff3366]/20">
            <Heart className="text-white w-6 h-6 fill-current" />
          </div>
          <span className="text-xl font-black text-slate-900 tracking-tighter uppercase">HEART CONNECT</span>
        </div>

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

        <div className="flex items-center gap-4">
          {profile && (
            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-2xl border border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900">{profile.name}</p>
                <p className="text-[10px] font-bold text-[#ff3366] uppercase tracking-wider">{profile.level} • {profile.points} pts</p>
              </div>
              <img 
                src={profile.photos?.[0] || `https://picsum.photos/seed/${profile.uid}/100/100`} 
                className="w-8 h-8 rounded-xl object-cover border-2 border-white shadow-sm"
                referrerPolicy="no-referrer"
              />
            </div>
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
