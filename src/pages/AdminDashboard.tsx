import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Post, Report, Advert } from '../types';
import { Users, FileText, AlertTriangle, BarChart3, Trash2, Ban, CheckCircle, ShieldCheck, BadgeCheck, Star, Trophy, Edit3, Heart, MessageCircle, Settings, Megaphone, Code, Flag, Check, X, DollarSign, Eye, MousePointer2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy, doc, updateDoc, deleteDoc, onSnapshot, setDoc, where } from 'firebase/firestore';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [adverts, setAdverts] = useState<Advert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'verifications' | 'reports' | 'adverts' | 'settings'>('users');
  const [siteSettings, setSiteSettings] = useState({
    pointValue: 0.01,
    announcement: '',
    adHtml: ''
  });

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'site'), (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as any);
      }
    });
    return () => unsubSettings();
  }, []);

  const handleSaveSettings = async () => {
    try {
      await setDoc(doc(db, 'settings', 'site'), siteSettings);
      alert('Settings saved successfully!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/site');
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const usersSnap = await getDocs(query(collection(db, 'users'), limit(50)));
        const postsSnap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(50)));
        const reportsSnap = await getDocs(query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(50)));
        const advertsSnap = await getDocs(query(collection(db, 'adverts'), orderBy('createdAt', 'desc'), limit(50)));
        
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
        setReports(reportsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Report)));
        setAdverts(advertsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Advert)));
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, 'admin_dashboard_fetch');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handlePromote = async (userId: string) => {
    if (!window.confirm("Are you sure you want to promote this user to admin?")) return;
    try {
      await updateDoc(doc(db, 'users', userId), { role: 'admin' });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, role: 'admin' } : u));
      alert("User promoted to admin successfully!");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, 'posts', postId));
      setPosts(prev => prev.filter(p => p.id !== postId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `posts/${postId}`);
    }
  };

  const handleVerifyUser = async (userId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        isVerified: approve,
        isVerifiedPending: false
      });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, isVerified: approve, isVerifiedPending: false } : u));
      alert(`User verification ${approve ? 'approved' : 'rejected'}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleBanUser = async (userId: string, ban: boolean) => {
    if (!window.confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} this user?`)) return;
    try {
      await updateDoc(doc(db, 'users', userId), { isBanned: ban });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, isBanned: ban } : u));
      alert(`User ${ban ? 'banned' : 'unbanned'} successfully`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    const days = prompt("Enter suspension duration in days (0 to unsuspend):", "7");
    if (days === null) return;
    const duration = parseInt(days);
    const until = duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString() : null;
    try {
      await updateDoc(doc(db, 'users', userId), {
        isSuspended: duration > 0,
        suspensionUntil: until
      });
      setUsers(prev => prev.map(u => u.uid === userId ? { ...u, isSuspended: duration > 0, suspensionUntil: until } : u));
      alert(`User ${duration > 0 ? 'suspended' : 'unsuspended'} successfully`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const handleResolveReport = async (reportId: string) => {
    try {
      await updateDoc(doc(db, 'reports', reportId), { status: 'resolved' });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'resolved' } : r));
      alert("Report marked as resolved");
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `reports/${reportId}`);
    }
  };

  const handleApproveAdvert = async (advertId: string, approve: boolean) => {
    try {
      await updateDoc(doc(db, 'adverts', advertId), { status: approve ? 'active' : 'rejected' });
      setAdverts(prev => prev.map(a => a.id === advertId ? { ...a, status: approve ? 'active' : 'rejected' } : a));
      alert(`Advert ${approve ? 'approved' : 'rejected'}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `adverts/${advertId}`);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'bg-purple-500' },
    { label: 'Reports', value: reports.filter(r => r.status === 'pending').length, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Active Ads', value: adverts.filter(a => a.status === 'active').length, icon: Megaphone, color: 'bg-emerald-500' },
  ];

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold text-slate-900">Admin Dashboard</h2>
        <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl flex items-center gap-2 font-bold text-sm">
          <CheckCircle className="w-4 h-4" />
          <span>System Online</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
            <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-white shadow-lg", stat.color)}>
              <stat.icon className="w-6 h-6" />
            </div>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest">{stat.label}</p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex gap-4 border-b border-slate-100">
          <button 
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'users' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Users
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'posts' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Posts
            {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('verifications')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'verifications' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Verifications
            {activeTab === 'verifications' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('reports')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'reports' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Reports
            {activeTab === 'reports' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('adverts')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'adverts' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Adverts
            {activeTab === 'adverts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'settings' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Settings
            {activeTab === 'settings' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
        </div>

        {activeTab === 'users' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-xs font-bold uppercase tracking-widest">
                  <th className="px-8 py-4">User</th>
                  <th className="px-8 py-4">Level</th>
                  <th className="px-8 py-4">Verification</th>
                  <th className="px-8 py-4">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-3">
                        <img src={user.photos?.[0] || `https://picsum.photos/seed/${user.uid}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-bold text-slate-900">{user.name}</p>
                            {user.isVerified && <BadgeCheck className="w-3 h-3 text-blue-500 fill-blue-500" />}
                          </div>
                          <p className="text-xs text-slate-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex items-center gap-2">
                        {user.level === 'Platinum' && <Trophy className="w-4 h-4 text-slate-400" />}
                        {user.level === 'Gold' && <Star className="w-4 h-4 text-yellow-500" />}
                        {user.level === 'Bronze' && <Star className="w-4 h-4 text-orange-400" />}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-wider",
                          user.level === 'Platinum' ? "text-slate-400" :
                          user.level === 'Gold' ? "text-yellow-600" :
                          "text-orange-600"
                        )}>{user.level || 'Bronze'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-4">
                      <span className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        user.isVerified ? "bg-blue-50 text-blue-600" : "bg-slate-50 text-slate-400"
                      )}>
                        {user.isVerified ? 'Verified' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-8 py-4">
                      <div className="flex gap-2">
                        <Link 
                          to={`/profile/${user.uid}`}
                          className="p-2 text-slate-400 hover:text-[#ff3366] transition-colors"
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Link>
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => handlePromote(user.uid)}
                            className="p-2 text-slate-400 hover:text-emerald-500 transition-colors"
                            title="Promote to Admin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button 
                          onClick={() => handleSuspendUser(user.uid)}
                          className={cn("p-2 transition-colors", user.isSuspended ? "text-orange-500" : "text-slate-400 hover:text-orange-500")}
                          title={user.isSuspended ? "Unsuspend" : "Suspend"}
                        >
                          <AlertTriangle className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleBanUser(user.uid, !user.isBanned)}
                          className={cn("p-2 transition-colors", user.isBanned ? "text-red-600" : "text-slate-400 hover:text-red-600")}
                          title={user.isBanned ? "Unban" : "Ban"}
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'verifications' && (
          <div className="p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-900">Verification Requests</h3>
            {users.filter(u => u.isVerifiedPending).map(user => (
              <div key={user.uid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <img src={user.photos?.[0]} className="w-12 h-12 rounded-xl object-cover" />
                  <div>
                    <p className="font-bold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-400">{user.email}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleVerifyUser(user.uid, true)} className="p-2 bg-emerald-100 text-emerald-600 rounded-lg hover:bg-emerald-200 transition-all">
                    <Check className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleVerifyUser(user.uid, false)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-all">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {users.filter(u => u.isVerifiedPending).length === 0 && <p className="text-center py-12 text-slate-400 font-bold italic">No pending requests</p>}
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-900">Content Reports</h3>
            {reports.map(report => (
              <div key={report.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    <Flag className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">{report.targetType} Report</span>
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black uppercase", report.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600")}>
                      {report.status}
                    </span>
                  </div>
                  {report.status === 'pending' && (
                    <button onClick={() => handleResolveReport(report.id)} className="text-xs font-bold text-emerald-600 hover:underline">Mark Resolved</button>
                  )}
                </div>
                <p className="text-sm text-slate-600 font-medium bg-white p-3 rounded-xl border border-slate-100 italic">"{report.reason}"</p>
                <div className="flex justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <span>By: {report.reporterId}</span>
                  <span>Target: {report.targetId}</span>
                </div>
              </div>
            ))}
            {reports.length === 0 && <p className="text-center py-12 text-slate-400 font-bold italic">No reports yet</p>}
          </div>
        )}

        {activeTab === 'adverts' && (
          <div className="p-8 space-y-6">
            <h3 className="text-xl font-black text-slate-900">Sponsored Adverts</h3>
            {adverts.map(ad => (
              <div key={ad.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <img src={ad.imageUrl || 'https://picsum.photos/seed/ad/200/200'} className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <h4 className="font-bold text-slate-900">{ad.title}</h4>
                      <p className="text-xs text-slate-500">{ad.description || 'No description'}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-black uppercase", 
                      ad.status === 'active' ? "bg-emerald-100 text-emerald-600" : 
                      ad.status === 'pending' ? "bg-orange-100 text-orange-600" : "bg-red-100 text-red-600"
                    )}>
                      {ad.status}
                    </span>
                    {ad.status === 'pending' && (
                      <div className="flex gap-2">
                        <button onClick={() => handleApproveAdvert(ad.id, true)} className="p-1 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200"><Check className="w-4 h-4" /></button>
                        <button onClick={() => handleApproveAdvert(ad.id, false)} className="p-1 bg-red-100 text-red-600 rounded hover:bg-red-200"><X className="w-4 h-4" /></button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-4 pt-4 border-t border-slate-200">
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Type</p>
                    <p className="text-sm font-black text-slate-900">{ad.type}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Budget</p>
                    <p className="text-sm font-black text-slate-900">${ad.budget}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Clicks</p>
                    <p className="text-sm font-black text-slate-900 flex items-center justify-center gap-1"><MousePointer2 className="w-3 h-3" /> {ad.clicks}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Impressions</p>
                    <p className="text-sm font-black text-slate-900 flex items-center justify-center gap-1"><Eye className="w-3 h-3" /> {ad.impressions}</p>
                  </div>
                </div>
              </div>
            ))}
            {adverts.length === 0 && <p className="text-center py-12 text-slate-400 font-bold italic">No adverts yet</p>}
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="p-8 space-y-8">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Settings className="w-6 h-6 text-[#ff3366]" />
                  <h3 className="text-xl font-black text-slate-900">General Settings</h3>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Point Value (e.g. 0.01 = $0.01 per point)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-400">$</span>
                      <input 
                        type="number" 
                        step="0.001"
                        value={siteSettings.pointValue}
                        onChange={(e) => setSiteSettings({...siteSettings, pointValue: parseFloat(e.target.value)})}
                        className="w-full bg-white border border-slate-200 rounded-xl p-4 pl-8 focus:outline-none font-bold"
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <p className="text-xs text-blue-700 font-bold leading-relaxed">
                      Current Value: 100 Points = ${(siteSettings.pointValue * 100).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <Megaphone className="w-6 h-6 text-[#ff3366]" />
                  <h3 className="text-xl font-black text-slate-900">Announcements</h3>
                </div>
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Site-wide Announcement</label>
                    <textarea 
                      value={siteSettings.announcement}
                      onChange={(e) => setSiteSettings({...siteSettings, announcement: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:outline-none h-32 resize-none font-medium"
                      placeholder="Enter announcement text..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <Code className="w-6 h-6 text-[#ff3366]" />
                <h3 className="text-xl font-black text-slate-900">Advertising System</h3>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Ad HTML Code (e.g. Google AdSense, Custom Banners)</label>
                  <textarea 
                    value={siteSettings.adHtml}
                    onChange={(e) => setSiteSettings({...siteSettings, adHtml: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-xl p-4 focus:outline-none h-48 resize-none font-mono text-xs"
                    placeholder="Paste HTML/JS code here..."
                  />
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-xs text-amber-700 font-bold leading-relaxed">
                    Warning: Be careful when pasting HTML/JS code. Only use trusted sources.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveSettings}
                className="bg-[#ff3366] text-white px-12 py-4 rounded-2xl font-black shadow-xl shadow-[#ff3366]/20 hover:scale-105 transition-all text-lg"
              >
                Save All Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
