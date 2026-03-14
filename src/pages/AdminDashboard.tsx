import React, { useState, useEffect } from 'react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { UserProfile, Post } from '../types';
import { Users, FileText, AlertTriangle, BarChart3, Trash2, Ban, CheckCircle, ShieldCheck, BadgeCheck, Star, Trophy, Edit3, Heart, MessageCircle, Settings, Megaphone, Code } from 'lucide-react';
import { cn } from '../lib/utils';
import { Link } from 'react-router-dom';
import { collection, getDocs, query, limit, orderBy, doc, updateDoc, deleteDoc, onSnapshot, setDoc } from 'firebase/firestore';

const AdminDashboard: React.FC = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'posts' | 'settings'>('users');
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
        
        setUsers(usersSnap.docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)));
        setPosts(postsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Post)));
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

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const stats = [
    { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
    { label: 'Total Posts', value: posts.length, icon: FileText, color: 'bg-purple-500' },
    { label: 'Reports', value: 0, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Active Now', value: 12, icon: BarChart3, color: 'bg-emerald-500' },
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
            User Management
            {activeTab === 'users' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('posts')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'posts' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Post Moderation
            {activeTab === 'posts' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#ff3366]" />}
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={cn(
              "px-6 py-4 font-bold text-sm transition-all relative",
              activeTab === 'settings' ? "text-[#ff3366]" : "text-slate-400 hover:text-slate-600"
            )}
          >
            Site Settings
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
                        <button className="p-2 text-slate-400 hover:text-orange-500 transition-colors"><Ban className="w-4 h-4" /></button>
                        <button className="p-2 text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="p-8 space-y-6">
            {posts.map(post => (
              <div key={post.id} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all group">
                <img src={post.authorPhoto || `https://picsum.photos/seed/${post.userId}/100/100`} className="w-10 h-10 rounded-xl object-cover" referrerPolicy="no-referrer" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700 line-clamp-2 leading-relaxed">{post.content}</p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">by {post.authorName}</p>
                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Heart className="w-3 h-3" /> {post.likes.length}</span>
                      <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" /> {post.comments.length}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => handleDeletePost(post.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
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
