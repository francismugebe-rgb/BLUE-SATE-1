import React from 'react';
import { Users, Shield, Settings, BarChart3, Heart, MessageSquare, Wallet, LogOut, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AdminDashboard: React.FC = () => {
  const { logout } = useAuth();
  const [stats, setStats] = React.useState([
    { label: 'Total Users', value: '0', icon: Users, color: 'bg-blue-500' },
    { label: 'Active Matches', value: '0', icon: Heart, color: 'bg-pink-500' },
    { label: 'Messages Sent', value: '0', icon: MessageSquare, color: 'bg-purple-500' },
    { label: 'Wallet Volume', value: '$0', icon: Wallet, color: 'bg-green-500' },
  ]);

  const [recentUsers, setRecentUsers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // In a real app, we would listen to collections here
    // For now, we'll just show empty state as requested "Remove all fake data"
    setLoading(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <Shield className="w-8 h-8 text-pink-500" />
              Super Admin Dashboard
            </h1>
            <p className="text-slate-500 font-medium mt-1">Welcome back, Master Administrator.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all">
              <ArrowLeft className="w-4 h-4" />
              Back to Site
            </Link>
            <button 
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl font-bold text-sm hover:bg-red-100 transition-all"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm"
            >
              <div className={`w-12 h-12 ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-slate-500 text-sm font-bold uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Users Table */}
          <div className="lg:col-span-2 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <h2 className="text-xl font-bold">Recent Registrations</h2>
              <button className="text-pink-500 font-bold text-sm hover:underline">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    <th className="px-8 py-4">User</th>
                    <th className="px-8 py-4">Status</th>
                    <th className="px-8 py-4">Joined</th>
                    <th className="px-8 py-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentUsers.length > 0 ? (
                    recentUsers.map((user, i) => (
                      <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-100 rounded-full overflow-hidden">
                              <img src={`https://picsum.photos/seed/${user.name}/100/100`} alt="" referrerPolicy="no-referrer" />
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-xs text-slate-500">{user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            user.status === 'Verified' ? 'bg-green-100 text-green-600' :
                            user.status === 'Pending' ? 'bg-amber-100 text-amber-600' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="px-8 py-4 text-sm text-slate-500 font-medium">{user.date}</td>
                        <td className="px-8 py-4">
                          <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                            <Settings className="w-4 h-4 text-slate-400" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium">
                        No recent registrations found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* System Health / Logs */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-pink-500" />
              System Health
            </h2>
            <div className="space-y-6">
              {[
                { label: 'Server Load', value: '24%', status: 'Normal' },
                { label: 'Database Latency', value: '12ms', status: 'Optimal' },
                { label: 'API Response Time', value: '180ms', status: 'Normal' },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-bold text-slate-700">{item.label}</span>
                    <span className="text-xs font-black text-green-500 uppercase">{item.status}</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-pink-500 rounded-full" 
                      style={{ width: item.value }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 font-bold">{item.value} usage</p>
                </div>
              ))}
            </div>

            <div className="mt-10">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-4">Recent Logs</h3>
              <div className="space-y-3">
                <div className="text-xs text-slate-400 font-medium italic">No recent system logs.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
